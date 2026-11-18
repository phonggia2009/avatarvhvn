'use strict';
const $ = id => document.getElementById(id), canvas = $('preview'), ctx = canvas.getContext('2d');
const frame = new Image(), mask = document.createElement('canvas'), layer = document.createElement('canvas');
let photo = null, region = null, ready = false, zoom = 1, x = 0, y = 0, base = 1, revision = 0;
const pointers = new Map();
function message(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
// Flood-fill transparency connected to the outer edge. Only enclosed openings
// receive the portrait; corner transparency remains exactly as in the original.
function analyzeFrame() {
    const w = frame.naturalWidth, h = frame.naturalHeight;
    if (w !== h) throw new Error('Khung ảnh cần có tỷ lệ vuông.');
    canvas.width = mask.width = layer.width = w; canvas.height = mask.height = layer.height = h;
    const mc = mask.getContext('2d'); mc.drawImage(frame, 0, 0);
    const pixels = mc.getImageData(0, 0, w, h), d = pixels.data, seen = new Uint8Array(w * h), q = new Int32Array(w * h); let head = 0, tail = 0;
    const visit = i => { if (!seen[i] && d[i * 4 + 3] < 128) { seen[i] = 1; q[tail++] = i; } };
    for (let a = 0; a < w; a++) { visit(a); visit((h - 1) * w + a); } for (let b = 0; b < h; b++) { visit(b * w); visit(b * w + w - 1); }
    while (head < tail) { const i = q[head++], xx = i % w; if (xx) visit(i - 1); if (xx < w - 1) visit(i + 1); if (i >= w) visit(i - w); if (i < w * (h - 1)) visit(i + w); }
    // Grow the enclosed clear area slightly into its anti-aliased edge.
    const opening = new Uint8Array(w * h); head = 0; tail = 0;
    for (let i = 0; i < w * h; i++)if (!seen[i] && d[i * 4 + 3] < 128) { opening[i] = 1; q[tail++] = i; }
    while (head < tail) { const i = q[head++]; if (opening[i] >= 4) continue; const xx = i % w; const neighbors = []; if (xx) neighbors.push(i - 1); if (xx < w - 1) neighbors.push(i + 1); if (i >= w) neighbors.push(i - w); if (i < w * (h - 1)) neighbors.push(i + w); for (const n of neighbors) if (!opening[n] && d[n * 4 + 3] < 250) { opening[n] = opening[i] + 1; q[tail++] = n; } }
    let left = w, right = 0, top = h, bottom = 0, count = 0;
    for (let i = 0; i < w * h; i++) { const inside = !!opening[i]; if (inside && d[i * 4 + 3] < 128) { const xx = i % w, yy = Math.floor(i / w); left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy); count++; } d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = inside ? 255 : 0; }
    if (count < w * h * .05) throw new Error('Không tìm thấy vùng trong suốt của khung.');
    mc.putImageData(pixels, 0, 0); region = { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1, cx: (left + right) / 2, cy: (top + bottom) / 2 };
    $('dimensions').textContent = `${w} × ${h} px`;
}
function constrain() { if (!photo) return; const sw = photo.naturalWidth * base * zoom, sh = photo.naturalHeight * base * zoom; x = Math.max(region.right - sw / 2, Math.min(region.left + sw / 2, x)); y = Math.max(region.bottom - sh / 2, Math.min(region.top + sh / 2, y)); }
function draw() { if (!ready) return; const lc = layer.getContext('2d'); lc.clearRect(0, 0, layer.width, layer.height); lc.imageSmoothingEnabled = true; lc.imageSmoothingQuality = 'high'; if (photo) { constrain(); const w = photo.naturalWidth * base * zoom, h = photo.naturalHeight * base * zoom; lc.drawImage(photo, x - w / 2, y - h / 2, w, h); } else { lc.fillStyle = '#eaf0ed'; lc.fillRect(0, 0, layer.width, layer.height); } lc.globalCompositeOperation = 'destination-in'; lc.drawImage(mask, 0, 0); lc.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(layer, 0, 0); ctx.drawImage(frame, 0, 0); }
function center() { if (!photo) return; zoom = 1; base = Math.max(region.width / photo.naturalWidth, region.height / photo.naturalHeight); x = region.cx; y = region.cy; updateZoom(); }
function updateZoom() { $('zoom').value = zoom; $('zoom-value').textContent = `${Math.round(zoom * 100)}%`; draw(); }
function setZoom(value, anchor = { x: region.cx, y: region.cy }) { const old = zoom; zoom = Math.max(1, Math.min(4, value)); x = anchor.x + (x - anchor.x) * zoom / old; y = anchor.y + (y - anchor.y) * zoom / old; updateZoom(); }
function controls() { const has = !!photo; $('empty').hidden = has; $('choose-label').textContent = has ? 'Đổi ảnh' : 'Chọn ảnh'; for (const id of ['zoom', 'center', 'reset']) $(id).disabled = !has; }
function pick() { if (!ready) { message('Khung ảnh đang tải, bạn vui lòng chờ một chút.'); return; } $('file').click(); }
function loadPhoto(file) { const ticket = ++revision; if (!file) return; if (!file.type.startsWith('image/')) { message('File này không phải ảnh. Bạn hãy chọn ảnh JPG, PNG hoặc WebP nhé.', true); return; } message('Đang mở ảnh…'); const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); if (ticket !== revision) return; photo = img; pointers.clear(); center(); controls(); $('file-name').textContent = file.name; message('Ảnh đã sẵn sàng. Kéo để căn chỉnh theo ý bạn.'); }; img.onerror = () => { URL.revokeObjectURL(url); if (ticket === revision) message('Trình duyệt chưa đọc được ảnh này. Bạn hãy thử ảnh JPG, PNG hoặc WebP nhé.', true); }; img.src = url; }
$('choose').onclick = $('empty').onclick = pick; $('file').onchange = e => { loadPhoto(e.target.files[0]); e.target.value = ''; };
$('center').onclick = () => { center(); message('Đã căn giữa ảnh.'); }; $('zoom').oninput = e => setZoom(Number(e.target.value));
$('reset').onclick = () => { revision++; photo = null; pointers.clear(); zoom = 1; controls(); updateZoom(); $('file-name').textContent = 'Hỗ trợ JPG, PNG, WebP và ảnh trình duyệt đọc được'; message('Chọn một ảnh mới để bắt đầu nhé.'); };
const point = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height }; };
canvas.onpointerdown = e => { if (!photo) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, point(e)); canvas.style.cursor = 'grabbing'; };
canvas.onpointermove = e => { if (!pointers.has(e.pointerId) || !photo) return; const before = [...pointers.values()]; const old = pointers.get(e.pointerId), p = point(e); pointers.set(e.pointerId, p); const after = [...pointers.values()]; if (before.length === 2) { const a = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 }, b = { x: (after[0].x + after[1].x) / 2, y: (after[0].y + after[1].y) / 2 }; const dist = v => Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); const z = zoom; zoom = Math.max(1, Math.min(4, zoom * dist(after) / Math.max(1, dist(before)))); x = b.x + (x - a.x) * zoom / z; y = b.y + (y - a.y) * zoom / z; updateZoom(); } else if (before.length === 1) { x += p.x - old.x; y += p.y - old.y; draw(); } };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, e => { pointers.delete(e.pointerId); if (!pointers.size) canvas.style.cursor = 'grab'; });
canvas.onkeydown = e => { if (!photo) return; const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key]; if (delta) { e.preventDefault(); x += delta[0]; y += delta[1]; draw(); } };
$('download').onclick = () => { if (!photo) { message('Bạn hãy chọn ảnh trước khi tải ảnh đại diện nhé.', true); return; } draw(); canvas.toBlob(blob => { if (!blob) { message('Chưa thể xuất ảnh. Vui lòng thử lại nhé.', true); return; } const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'anh-dai-dien-van-hoa-viet-nam-son-dong.png'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); message('Ảnh PNG đã sẵn sàng. Kiểm tra mục tải xuống của thiết bị nhé.'); }, 'image/png'); };
frame.onload = () => { try { analyzeFrame(); ready = true; draw(); message('Chọn ảnh để bắt đầu tạo ảnh đại diện.'); } catch (e) { message(e.message, true); } }; frame.onerror = () => message('Không tải được khung ảnh. Bạn vui lòng tải lại trang.', true); frame.src = 'frame_vh_vn.png?v=2';

