#!/usr/bin/env python3
"""
绘灵造物 - ComfyUI Image Generation Web Server
通过 ComfyUI API 运行 GenerateImageV2 工作流，支持图片输入和输出显示。
"""

import os
import sys
import json
import uuid
import time
import base64
import hashlib
import shutil
import asyncio
import zipfile
import logging
from pathlib import Path
from io import BytesIO
from typing import Optional

import requests
import aiohttp
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Request, HTTPException, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ==================== 配置 ====================
COMFYUI_BASE = "http://127.0.0.1:8188"
COMFYUI_INPUT_DIR = Path("/root/ComfyUI/input")
COMFYUI_OUTPUT_DIR = Path("/root/ComfyUI/output")
WORKFLOW_PATH = Path(__file__).parent / "GenerateImageV2.json"
STATIC_DIR = Path(__file__).parent / "static"
OUTPUT_CACHE_DIR = Path("/root/autodl-tmp/web/output_cache")

# 3D 生成服务器配置（部署在另一台 AutoDL 实例上）
THREED_SERVER_BASE = os.environ.get("THREED_SERVER_BASE", "https://u945009-9d52-ac546f33.nmb1.seetacloud.com:8443")
THREED_CACHE_DIR = Path("/root/autodl-tmp/web/threed_cache")

# 确保目录存在
STATIC_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_CACHE_DIR.mkdir(parents=True, exist_ok=True)
THREED_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ==================== FastAPI 应用 ====================
app = FastAPI(title="绘灵造物", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== ComfyUI 通信 ====================
def load_workflow() -> dict:
    """加载工作流 JSON"""
    with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_comfy_history(prompt_id: str) -> Optional[dict]:
    """获取 ComfyUI 执行历史"""
    try:
        resp = requests.get(f"{COMFYUI_BASE}/history/{prompt_id}", timeout=10)
        if resp.status_code == 200:
            return resp.json().get(prompt_id)
    except Exception as e:
        logger.error(f"获取历史失败: {e}")
    return None


async def upload_image_to_comfyui(image_bytes: bytes, filename: str) -> str:
    """上传图片到 ComfyUI input 目录"""
    target = COMFYUI_INPUT_DIR / filename
    with open(target, "wb") as f:
        f.write(image_bytes)
    logger.info(f"图片已上传到 ComfyUI: {target}")
    return filename


def get_output_images_from_history(history: dict) -> dict:
    """从 ComfyUI 历史中提取输出图片信息"""
    results = {}
    
    # 关注的输出节点及其标签
    output_nodes = {
        "8": "sdxl_gen",      # SDXL 初代生成
        "30": "front_view",   # 正面全身
        "58": "back_view",    # 背面全身  
        "83": "side_view",    # 侧面全身
    }
    
    outputs = history.get("outputs", {})
    for node_id, label in output_nodes.items():
        node_output = outputs.get(node_id)
        if node_output and "images" in node_output:
            images = node_output["images"]
            for img in images:
                filename = img.get("filename", "")
                subfolder = img.get("subfolder", "")
                img_type = img.get("type", "output")
                
                # 构建完整路径
                if img_type == "output":
                    full_path = COMFYUI_OUTPUT_DIR / subfolder / filename
                else:
                    full_path = COMFYUI_OUTPUT_DIR / filename
                
                results[label] = {
                    "filename": filename,
                    "subfolder": subfolder,
                    "type": img_type,
                    "path": str(full_path),
                }
                break  # 每个节点只取第一张
    
    return results


# ==================== API 路由 ====================
@app.get("/", response_class=HTMLResponse)
async def index():
    """返回主页"""
    html_path = STATIC_DIR / "index.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf-8")
    return HTMLResponse("<h1>请先创建 static/index.html</h1>")


@app.post("/api/generate")
async def generate_image(
    image: UploadFile = File(...),
    positive_prompt: str = Form(""),
    negative_prompt: str = Form(""),
    style: str = Form(""),
    controlnet_strength: float = Form(0.6),
    controlnet_start: float = Form(0.0),
    controlnet_end: float = Form(0.842),
    ksampler_steps: int = Form(30),
    ksampler_cfg: float = Form(1.5),
    ksampler_denoise: float = Form(0.5),
):
    """
    接收上传图片，运行 ComfyUI 工作流，返回生成结果
    所有提示词和参数仅影响第一个生成图片的工作流 (Node 3/6/7/13)
    """
    # 1. 验证图片
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "请上传图片文件")
    
    image_bytes = await image.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(400, "图片大小不能超过 20MB")
    
    # 2. 生成唯一标识
    task_id = str(uuid.uuid4())[:8]
    ext = Path(image.filename or "image.png").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".bmp"):
        ext = ".png"
    
    upload_filename = f"web_upload_{task_id}{ext}"
    
    # 3. 上传图片到 ComfyUI input 目录
    await upload_image_to_comfyui(image_bytes, upload_filename)
    
    # 4. 修改工作流中的 LoadImage 节点 (Node 12)
    workflow = load_workflow()
    if "12" not in workflow:
        raise HTTPException(500, "工作流中未找到 LoadImage 节点 (12)")
    
    workflow["12"]["inputs"]["image"] = upload_filename

    # ---- 注入正向提示词 (Node 6) ----
    # 风格预设注入 + 用户正向提示词
    style_prompts = {
        "anime": "高质量，高清，超凡细节，动漫风格",
        "fantasy": "fantasy character, magical, glowing elements, detailed armor, high quality, masterpiece",
        "realistic": "realistic character, detailed texture, natural lighting, photorealistic, PBR, high quality",
        "cute": "cute character, chibi style, big eyes, adorable, soft colors, high quality, kawaii",
    }
    base_positive = "高质量，高清，超凡细节，一个小男孩，穿着斗篷\n，动漫风格"
    if style and style in style_prompts:
        style_inject = style_prompts[style]
    else:
        style_inject = ""
    
    if positive_prompt.strip():
        # 用户填写了正向提示词，使用用户的
        final_positive = style_inject + (", " + positive_prompt.strip() if style_inject else positive_prompt.strip())
    elif style_inject:
        # 未填写但选了风格，使用风格+默认
        final_positive = style_inject
    else:
        # 都没选，使用默认
        final_positive = base_positive
    
    if "6" in workflow:
        workflow["6"]["inputs"]["text"] = final_positive
        logger.info(f"正向提示词: {final_positive[:100]}...")

    # ---- 注入负向提示词 (Node 7) ----
    if "7" in workflow:
        if negative_prompt.strip():
            workflow["7"]["inputs"]["text"] = negative_prompt.strip()
        else:
            workflow["7"]["inputs"]["text"] = "text, watermark,"
        logger.info(f"负向提示词: {workflow['7']['inputs']['text'][:100]}...")

    # ---- 注入 ControlNet 参数 (Node 13) ----
    if "13" in workflow:
        workflow["13"]["inputs"]["strength"] = max(0.0, min(1.0, controlnet_strength))
        workflow["13"]["inputs"]["start_percent"] = max(0.0, min(1.0, controlnet_start))
        workflow["13"]["inputs"]["end_percent"] = max(0.0, min(1.0, controlnet_end))
        logger.info(f"ControlNet: strength={controlnet_strength}, start={controlnet_start}, end={controlnet_end}")

    # ---- 注入 KSampler 参数 (Node 3, 仅第一个生成) ----
    if "3" in workflow:
        workflow["3"]["inputs"]["steps"] = max(1, min(100, ksampler_steps))
        workflow["3"]["inputs"]["cfg"] = max(1.0, min(20.0, ksampler_cfg))
        workflow["3"]["inputs"]["denoise"] = max(0.0, min(1.0, ksampler_denoise))
        logger.info(f"KSampler(3): steps={ksampler_steps}, cfg={ksampler_cfg}, denoise={ksampler_denoise}")

    # 设置随机种子让每次生成不同
    workflow["3"]["inputs"]["seed"] = int(time.time() * 1000) % (2**63)
    workflow["38"]["inputs"]["seed"] = int(time.time() * 1000 + 1) % (2**63)
    workflow["70"]["inputs"]["seed"] = int(time.time() * 1000 + 2) % (2**63)
    workflow["79"]["inputs"]["seed"] = int(time.time() * 1000 + 3) % (2**63)
    
    # 5. 提交工作流到 ComfyUI
    payload = {"prompt": workflow, "client_id": f"web_client_{task_id}"}
    
    try:
        resp = requests.post(f"{COMFYUI_BASE}/prompt", json=payload, timeout=30)
        if resp.status_code != 200:
            raise HTTPException(500, f"ComfyUI 提交失败: {resp.text}")
        prompt_id = resp.json().get("prompt_id")
        if not prompt_id:
            raise HTTPException(500, "未获取到 prompt_id")
    except requests.RequestException as e:
        raise HTTPException(500, f"无法连接 ComfyUI: {e}")
    
    logger.info(f"工作流已提交: prompt_id={prompt_id}, task={task_id}")
    
    # 6. 轮询等待完成 (最长 10 分钟)
    max_wait = 600
    poll_interval = 3
    waited = 0
    
    history = None
    while waited < max_wait:
        await asyncio.sleep(poll_interval)
        waited += poll_interval
        
        # 先检查队列状态
        try:
            queue_resp = requests.get(f"{COMFYUI_BASE}/queue", timeout=5)
            if queue_resp.status_code == 200:
                queue_data = queue_resp.json()
                running = queue_data.get("queue_running", [])
                pending = queue_data.get("queue_pending", [])
                # 检查我们的任务是否还在队列中
                our_running = any(item[1] == prompt_id for item in running)
                our_pending = any(item[1] == prompt_id for item in pending)
                
                if not our_running and not our_pending:
                    # 任务已完成，获取历史
                    history = get_comfy_history(prompt_id)
                    if history:
                        break
        except Exception as e:
            logger.warning(f"轮询异常: {e}")
    
    if not history:
        raise HTTPException(500, "生成超时，请稍后重试")
    
    # 7. 提取输出图片
    output_images = get_output_images_from_history(history)
    if not output_images:
        raise HTTPException(500, "未获取到生成结果")
    
    # 8. 复制输出图片到缓存目录并生成访问 URL
    result = {}
    for label, img_info in output_images.items():
        src_path = Path(img_info["path"])
        if not src_path.exists():
            logger.warning(f"输出文件不存在: {src_path}")
            continue
        
        # 复制到缓存目录
        cache_name = f"{task_id}_{label}.png"
        cache_path = OUTPUT_CACHE_DIR / cache_name
        shutil.copy2(src_path, cache_path)
        
        # 生成 base64 缩略图用于即时预览
        try:
            pil_img = Image.open(cache_path)
            pil_img.thumbnail((512, 512), Image.LANCZOS)
            buf = BytesIO()
            pil_img.save(buf, format="PNG")
            thumb_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        except Exception:
            thumb_b64 = None
        
        result[label] = {
            "url": f"/api/output/{cache_name}",
            "thumbnail": f"data:image/png;base64,{thumb_b64}" if thumb_b64 else None,
        }
    
    # 清理上传的图片
    try:
        (COMFYUI_INPUT_DIR / upload_filename).unlink(missing_ok=True)
    except Exception:
        pass
    
    return JSONResponse({
        "success": True,
        "task_id": task_id,
        "prompt_id": prompt_id,
        "images": result,
    })


@app.get("/api/output/{filename}")
async def get_output(filename: str):
    """获取缓存的输出图片"""
    filepath = OUTPUT_CACHE_DIR / filename
    if not filepath.exists():
        raise HTTPException(404, "图片不存在")
    return FileResponse(filepath, media_type="image/png")


@app.get("/api/health")
async def health():
    """健康检查"""
    try:
        resp = requests.get(f"{COMFYUI_BASE}/system_stats", timeout=5)
        comfyui_ok = resp.status_code == 200
    except Exception:
        comfyui_ok = False
    
    return {
        "status": "ok",
        "comfyui": "connected" if comfyui_ok else "disconnected",
    }


# ==================== 3D 代理 API ====================

async def _download_and_extract_3d_model(task_id: str):
    """从远端3D服务器下载模型zip并解压到本地缓存"""
    cache_dir = THREED_CACHE_DIR / task_id
    extract_dir = cache_dir / "extracted"
    
    if extract_dir.exists() and any(extract_dir.iterdir()):
        return  # 已经缓存
    
    cache_dir.mkdir(parents=True, exist_ok=True)
    extract_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{THREED_SERVER_BASE}/download/{task_id}",
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status != 200:
                    logger.error(f"下载3D模型失败: HTTP {resp.status}")
                    return
                
                zip_path = cache_dir / "model.zip"
                with open(zip_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        f.write(chunk)
        
        # 解压
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)
        
        logger.info(f"3D模型已缓存: {extract_dir}, 文件列表: {[f.name for f in extract_dir.iterdir()]}")
    except Exception as e:
        logger.error(f"下载/解压3D模型失败: {e}")


@app.post("/api/generate-3d")
async def generate_3d_from_front_view(task_id: str = Form(...)):
    """
    将2D生成的正面全身图发送到远端3D服务器进行3D模型生成。
    task_id: 2D生成任务ID（用于定位 front_view 图片）
    返回: {"threed_task_id": "..."}
    """
    # 查找正面全身图
    front_view_path = OUTPUT_CACHE_DIR / f"{task_id}_front_view.png"
    if not front_view_path.exists():
        raise HTTPException(404, f"未找到该任务的正面全身图: {task_id}")
    
    try:
        async with aiohttp.ClientSession() as session:
            with open(front_view_path, "rb") as f:
                form_data = aiohttp.FormData()
                form_data.add_field(
                    "file",
                    f.read(),
                    filename=f"{task_id}_front_view.png",
                    content_type="image/png"
                )
                async with session.post(
                    f"{THREED_SERVER_BASE}/generate",
                    data=form_data,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        raise HTTPException(502, f"3D服务器返回错误: {error_text}")
                    result = await resp.json()
    
    except aiohttp.ClientError as e:
        raise HTTPException(502, f"无法连接3D服务器: {e}")
    except Exception as e:
        raise HTTPException(500, f"3D生成请求失败: {e}")
    
    threed_task_id = result.get("task_id")
    if not threed_task_id:
        raise HTTPException(502, "3D服务器未返回 task_id")
    
    return JSONResponse({
        "success": True,
        "threed_task_id": threed_task_id,
        "status": "processing",
    })


@app.get("/api/3d-status/{task_id}")
async def get_3d_status(task_id: str):
    """查询远端3D生成任务的状态（代理）"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{THREED_SERVER_BASE}/status/{task_id}",
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(502, f"3D服务器状态查询失败")
                status_data = await resp.json()
    except aiohttp.ClientError as e:
        raise HTTPException(502, f"无法连接3D服务器: {e}")
    
    # 如果已完成，异步下载并缓存模型
    if status_data.get("status") == "completed":
        asyncio.create_task(_download_and_extract_3d_model(task_id))
    
    return JSONResponse(status_data)


@app.get("/api/3d-download/{task_id}")
async def download_3d_model(task_id: str):
    """
    代理下载3D模型zip。优先从本地缓存返回，否则从远端下载。
    """
    # 优先检查本地缓存
    local_zip = THREED_CACHE_DIR / task_id / "model.zip"
    if local_zip.exists():
        return FileResponse(
            path=str(local_zip),
            filename=f"{task_id}_model.zip",
            media_type="application/zip"
        )
    
    # 从远端流式代理，同时缓存并解压
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{THREED_SERVER_BASE}/download/{task_id}",
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status != 200:
                    error_text = await resp.text()
                    raise HTTPException(502, f"3D服务器下载失败: {error_text}")
                
                cache_dir = THREED_CACHE_DIR / task_id
                cache_dir.mkdir(parents=True, exist_ok=True)
                extract_dir = cache_dir / "extracted"
                
                async def stream_and_cache():
                    chunks = []
                    async for chunk in resp.content.iter_chunked(8192):
                        chunks.append(chunk)
                        yield chunk
                    with open(local_zip, "wb") as f:
                        for c in chunks:
                            f.write(c)
                    # 下载完成后自动解压
                    try:
                        extract_dir.mkdir(parents=True, exist_ok=True)
                        with zipfile.ZipFile(local_zip, 'r') as zf:
                            zf.extractall(extract_dir)
                        logger.info(f"3D模型已缓存并解压: {extract_dir}")
                    except Exception as e:
                        logger.error(f"解压失败: {e}")
                
                return StreamingResponse(
                    stream_and_cache(),
                    media_type="application/zip",
                    headers={"Content-Disposition": f"attachment; filename={task_id}_model.zip"}
                )
    except aiohttp.ClientError as e:
        raise HTTPException(502, f"无法连接3D服务器: {e}")


@app.get("/api/3d-cache/{task_id}")
async def cache_3d_model(task_id: str):
    """显式触发3D模型缓存下载和解压"""
    cache_dir = THREED_CACHE_DIR / task_id
    extract_dir = cache_dir / "extracted"
    
    # 如果已经缓存，直接返回文件列表
    if extract_dir.exists() and any(extract_dir.iterdir()):
        files = [f.name for f in extract_dir.iterdir() if f.is_file()]
        return JSONResponse({"status": "cached", "files": files})
    
    # 从远端下载
    try:
        cache_dir.mkdir(parents=True, exist_ok=True)
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{THREED_SERVER_BASE}/download/{task_id}",
                timeout=aiohttp.ClientTimeout(total=120)
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(502, f"3D服务器下载失败: HTTP {resp.status}")
                
                zip_path = cache_dir / "model.zip"
                with open(zip_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        f.write(chunk)
                
                with zipfile.ZipFile(zip_path, 'r') as zf:
                    zf.extractall(extract_dir)
                
                files = [f.name for f in extract_dir.iterdir() if f.is_file()]
                logger.info(f"3D模型缓存完成: {extract_dir}, 文件: {files}")
                return JSONResponse({"status": "cached", "files": files})
    except aiohttp.ClientError as e:
        raise HTTPException(502, f"无法连接3D服务器: {e}")
    except Exception as e:
        raise HTTPException(500, f"缓存失败: {e}")


@app.get("/api/3d-files/{task_id}/{filename:path}")
async def get_3d_file(task_id: str, filename: str):
    """
    获取已缓存的3D模型中的单个文件（OBJ、贴图等）。
    用于前端3D预览。
    """
    extract_dir = THREED_CACHE_DIR / task_id / "extracted"
    file_path = extract_dir / filename
    
    # 安全检查：防止路径遍历
    try:
        file_path.resolve().relative_to(extract_dir.resolve())
    except ValueError:
        raise HTTPException(403, "禁止访问")
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(404, f"文件不存在: {filename}")
    
    # 根据扩展名设置 MIME 类型
    ext = file_path.suffix.lower()
    media_type_map = {
        ".obj": "application/octet-stream",
        ".mtl": "application/octet-stream",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".glb": "model/gltf-binary",
        ".gltf": "model/gltf+json",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")
    
    return FileResponse(file_path, media_type=media_type)


# ==================== 启动 ====================
if __name__ == "__main__":
    import uvicorn
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
    logger.info(f"启动服务器: http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
