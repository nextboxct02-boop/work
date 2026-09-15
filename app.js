(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const SHEET = CONFIG.SHEET_NAME || "อัพเดตลูกค้า";
  const START_ROW = Number(CONFIG.DATA_START_ROW || 6);
  const READ_SCOPE = "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly";
  const WRITE_SCOPE = "openid email profile https://www.googleapis.com/auth/spreadsheets";

  const COL = {
    A:0, F:5, G:6, H:7, I:8, J:9, K:10, L:11, M:12, N:13, O:14, P:15, Q:16,
    R:17, S:18, T:19, U:20, V:21, W:22, X:23, Y:24, Z:25, AA:26, AB:27, AC:28,
    AD:29, AE:30, AF:31, AG:32, AH:33, AI:34, AJ:35, AK:36, AL:37, AS:44, AT:45,
    AU:46, AV:47, AW:48, BD:55, BE:56, BF:57, BG:58, BH:59, BO:66, BP:67, BQ:68,
    BR:69, BS:70, BZ:77, CA:78, CB:79, CC:80, CD:81, CK:88, CL:89, CM:90, CN:91,
    CO:92, CP:93, CQ:94, CR:95, CY:102, CZ:103, DA:104, DB:105, DC:106, DD:107,
    DE:108, DF:109, DG:110, DH:111, DI:112, DJ:113, DK:114, DL:115, DM:116, DN:117, DO:118, DP:119
  };

  const EDITABLE_FIELDS = [
    { col:"O", label:"วันเริ่มต้น", type:"text" },
    { col:"P", label:"กำหนดจบ", type:"text" },
    { col:"Q", label:"วันที่ส่งบรีฟ", type:"text" },
    { col:"R", label:"ผู้ทำ", type:"text" },
    { col:"S", label:"สถานะงานผลิต", type:"text" },
    { col:"T", label:"วันที่รับเข้า", type:"text" },
    { col:"U", label:"ผู้ดูแลพรูฟ", type:"text" },
    { col:"V", label:"วันส่งพรูฟ", type:"text" },
    { col:"W", label:"สถานะ Proof", type:"text" },
    { col:"X", label:"แจ้งแก้งาน", type:"text" },
    { col:"Y", label:"วันส่งแก้", type:"text" },
    { col:"Z", label:"วันส่งพรูฟหลังแก้", type:"text" },
    { col:"AA", label:"สถานะแก้", type:"text" },
    { col:"AB", label:"บริษัท", type:"text" },
    { col:"AC", label:"วันที่โพสต์", type:"text" },
    { col:"AD", label:"สถานะงาน/ลูกค้า", type:"text" },
    { col:"AE", label:"หมายเหตุงาน", type:"textarea" },
    { col:"AF", label:"วันจบงานจริง", type:"text" },
    { col:"DM", label:"หมายเหตุบรีฟ", type:"textarea" },
    { col:"DN", label:"ลิงก์ส่งรูป", type:"text" },
    { col:"DO", label:"ลิงก์ส่งบรีฟ / รับงาน", type:"text" },
  ];

  const FINGERPRINT_COLS = ["F","G","H","K","L","M","N","CY","CZ"];
  const els = {};
  let rows = [];
  let filteredRows = [];
  let accessToken = "";
  let authMode = "demo"; // demo | read | write
  let tokenClient = null;
  let requestedMode = "read";
  let currentUser = null;
  let currentEdit = null;

  const demoRows = [
    makeDemo(1001, "คุณเอ", "08X-XXX-1001", "หมวดรถ/อุปกรณ์ประดับยนต์", "บริการติดตั้งอุปกรณ์รถ", "Demo Auto", "ดา", "ทำอยู่", "รอตรวจ", "รอลูกค้าแจ้ง", "PACK B", 4, 10, 6000),
    makeDemo(1002, "คุณบี", "08X-XXX-1002", "หมวดอื่นๆ", "ร้านค้าส่ง", "Demo Wholesale", "เชอร์รี่", "ทำอยู่", "รอตรวจ", "รอลูกค้าแจ้ง", "PACK B", 5, 10, 6000),
    makeDemo(1003, "คุณซี", "08X-XXX-1003", "หมวดร้านอาหารหน้าร้าน/คาเฟ่", "ร้านอาหาร", "Demo Cafe", "เมย์", "ทำอยู่", "รอตรวจ", "รอลูกค้าแจ้ง", "PACK B", 8, 10, 6000),
    makeDemo(1004, "คุณดี", "08X-XXX-1004", "หมวดความงาม", "บริการความงาม", "Demo Beauty", "โอม", "ทำอยู่", "", "รอข้อมูลเพิ่มเติม", "PACK B + วิดีโอ", 10, 11, 7200),
    makeDemo(1005, "คุณอี", "08X-XXX-1005", "หมวดอื่นๆ", "ร้านของตกแต่ง", "Demo Decor", "เชอร์รี่", "ทำอยู่", "รอตรวจ", "รอลูกค้าแจ้ง", "PACK B", 4, 10, 15000),
    makeDemo(1006, "คุณเอฟ", "08X-XXX-1006", "หมวดสถาบัน/อาชีพ/กวดวิชา", "คอร์สเรียนออนไลน์", "Demo Academy", "โอม", "ทำอยู่", "รอตรวจ", "รอลูกค้าแจ้ง", "PACK A", 4, 5, 3000),
  ];

  function makeDemo(id, name, phone, category, product, page, owner, status, proof, customerStatus, pack, done, total, price) {
    const r = Array(120).fill("");
    r[COL.A] = id; r[COL.F] = "skill-H"; r[COL.G] = name; r[COL.H] = phone;
    r[COL.K] = category; r[COL.L] = product; r[COL.M] = String(price); r[COL.R] = owner;
    r[COL.S] = status; r[COL.W] = proof; r[COL.AD] = customerStatus; r[COL.CY] = page;
    r.__demoPack = { name: pack, done, total };
    return { row: r, rowNumber: START_ROW + Math.floor(Math.random()*90), demo: true };
  }

  function q(id) { return document.getElementById(id); }
  function val(row, col) { return (row?.[COL[col]] ?? "").toString().trim(); }
  function esc(s) { return String(s ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function norm(s) { return String(s ?? "").trim().toLowerCase(); }
  function columnLetter(index0) {
    let n = index0 + 1, out = "";
    while (n) { const r=(n-1)%26; out=String.fromCharCode(65+r)+out; n=Math.floor((n-1)/26); }
    return out;
  }
  function sheetRange(a1) { return `'${SHEET.replaceAll("'", "''")}'!${a1}`; }
  function sheetUrl(rowNumber) {
    const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(CONFIG.SPREADSHEET_ID || "")}/edit`;
    return `${base}#gid=${encodeURIComponent(CONFIG.SHEET_GID || "")}${rowNumber ? `&range=G${rowNumber}` : ""}`;
  }

  function init() {
    ["stats","customerRows","resultCount","searchInput","statusFilter","ownerFilter","categoryFilter","clearFiltersBtn","connectBtn","refreshBtn","connectionBadge","notice","editModeBtn","editModeText","drawer","drawerBackdrop","drawerTitle","drawerPageLink","drawerBody","drawerConflict","closeDrawerBtn","cancelBtn","saveBtn","openRowBtn","openSheetBtn","emptyState","toast"].forEach(id => els[id] = q(id));
    els.openSheetBtn.onclick = () => window.open(sheetUrl(), "_blank", "noopener");
    els.refreshBtn.onclick = refresh;
    els.connectBtn.onclick = () => requestToken("read");
    els.editModeBtn.onclick = () => authMode === "write" ? disableEditMode() : requestToken("write");
    els.searchInput.oninput = applyFilters;
    [els.statusFilter, els.ownerFilter, els.categoryFilter].forEach(el => el.onchange = applyFilters);
    els.clearFiltersBtn.onclick = clearFilters;
    els.closeDrawerBtn.onclick = closeDrawer;
    els.cancelBtn.onclick = closeDrawer;
    els.drawerBackdrop.onclick = closeDrawer;
    els.saveBtn.onclick = saveChanges;
    els.openRowBtn.onclick = () => currentEdit && window.open(sheetUrl(currentEdit.rowNumber), "_blank", "noopener");
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

    rows = demoRows;
    renderAll();
    waitForGoogleIdentity();
  }

  function waitForGoogleIdentity() {
    if (!CONFIG.GOOGLE_CLIENT_ID) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.google?.accounts?.oauth2) {
        clearInterval(t);
        setupTokenClient();
      } else if (tries > 60) clearInterval(t);
    }, 250);
  }

  function setupTokenClient(mode = "read") {
    requestedMode = mode;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: mode === "write" ? WRITE_SCOPE : READ_SCOPE,
      include_granted_scopes: true,
      callback: async (resp) => {
        if (resp.error) { toast(`เชื่อม Google ไม่สำเร็จ: ${resp.error}`, true); return; }
        accessToken = resp.access_token;
        authMode = requestedMode;
        try {
          currentUser = await fetchUserInfo();
          enforceAllowedEmail();
          await loadSheet();
          updateAuthUI();
          toast(authMode === "write" ? "เปิดโหมดแก้ไขแล้ว" : "เชื่อม Google Sheet แล้ว");
          if (currentEdit) openDrawer(rows.find(r => r.rowNumber === currentEdit.rowNumber) || rows[0]);
        } catch (e) {
          console.error(e);
          toast(e.message || "โหลดข้อมูลไม่สำเร็จ", true);
        }
      }
    });
    return tokenClient;
  }

  function requestToken(mode) {
    if (!CONFIG.GOOGLE_CLIENT_ID) {
      toast("กรุณาใส่ GOOGLE_CLIENT_ID ใน config.js ก่อน", true);
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      toast("Google Identity Services ยังโหลดไม่เสร็จ ลองกดอีกครั้ง", true);
      return;
    }
    const client = setupTokenClient(mode);
    client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  }

  async function fetchUserInfo() {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` }});
    if (!res.ok) return null;
    return res.json();
  }

  function enforceAllowedEmail() {
    const allowed = (CONFIG.ALLOWED_EMAILS || []).map(x => norm(x)).filter(Boolean);
    if (!allowed.length || !currentUser?.email) return;
    if (!allowed.includes(norm(currentUser.email))) {
      const email = currentUser.email;
      google.accounts.oauth2.revoke(accessToken, () => {});
      accessToken = ""; authMode = "demo";
      throw new Error(`อีเมล ${email} ไม่อยู่ใน ALLOWED_EMAILS`);
    }
  }

  async function sheetsFetch(path, options={}) {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(CONFIG.SPREADSHEET_ID)}${path}`, {
      ...options,
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type":"application/json", ...(options.headers || {}) }
    });
    if (!res.ok) {
      let msg = `Google Sheets API ${res.status}`;
      try { const j = await res.json(); msg = j.error?.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.status === 204 ? {} : res.json();
  }

  async function fetchMatrix() {
    const range = encodeURIComponent(sheetRange(`A:DP`));
    const data = await sheetsFetch(`/values/${range}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`);
    const values = data.values || [];
    const width = 120;
    return values.map(r => [...r, ...Array(Math.max(0,width-r.length)).fill("")].slice(0,width));
  }

  async function loadSheet() {
    const matrix = await fetchMatrix();
    rows = matrix.slice(START_ROW - 1).map((row, i) => ({ row, rowNumber: START_ROW + i, demo:false }))
      .filter(x => x.row.some(v => String(v ?? "").trim() !== ""));
    renderAll();
  }

  async function refresh() {
    if (authMode === "demo") { renderAll(); toast("รีเฟรชข้อมูลจำลองแล้ว"); return; }
    try { await loadSheet(); toast("รีเฟรชข้อมูลล่าสุดแล้ว"); }
    catch(e) { toast(e.message, true); }
  }

  function renderAll() {
    populateFilters();
    applyFilters();
    renderStats();
    updateAuthUI();
  }

  function populateFilters() {
    const current = { s:els.statusFilter.value, o:els.ownerFilter.value, c:els.categoryFilter.value };
    fillSelect(els.statusFilter, "ทุกสถานะ", unique(rows.map(x => val(x.row,"S")).filter(Boolean)), current.s);
    fillSelect(els.ownerFilter, "ทุกผู้ทำ", unique(rows.map(x => val(x.row,"R")).filter(Boolean)), current.o);
    fillSelect(els.categoryFilter, "ทุกหมวด", unique(rows.map(x => val(x.row,"K")).filter(Boolean)), current.c);
  }
  function unique(arr) { return [...new Set(arr)].sort((a,b)=>a.localeCompare(b,"th")); }
  function fillSelect(el, first, values, selected) {
    el.innerHTML = `<option value="">${esc(first)}</option>` + values.map(v => `<option ${v===selected?"selected":""} value="${esc(v)}">${esc(v)}</option>`).join("");
  }

  function clearFilters() {
    els.searchInput.value = ""; els.statusFilter.value=""; els.ownerFilter.value=""; els.categoryFilter.value=""; applyFilters();
  }

  function applyFilters() {
    const s = norm(els.searchInput.value), st=els.statusFilter.value, ow=els.ownerFilter.value, cat=els.categoryFilter.value;
    filteredRows = rows.filter(x => {
      const r=x.row;
      const hay = ["G","H","K","L","R","S","U","W","AD","AE","CY","CZ","DM"].map(c=>val(r,c)).join(" ").toLowerCase();
      return (!s || hay.includes(s)) && (!st || val(r,"S")===st) && (!ow || val(r,"R")===ow) && (!cat || val(r,"K")===cat);
    });
    renderTable();
    els.resultCount.textContent = `${filteredRows.length.toLocaleString("th-TH")} รายการ`;
  }

  function renderStats() {
    const total = rows.length;
    const working = rows.filter(x => /ทำอยู่|กำลัง|ดำเนิน/.test(val(x.row,"S"))).length;
    const proof = rows.filter(x => /รอตรวจ|proof|พรูฟ/i.test(val(x.row,"W"))).length;
    const waiting = rows.filter(x => /รอลูกค้า|รอแจ้ง|รอข้อมูล|รอตกลง/.test(val(x.row,"AD")+" "+val(x.row,"AE"))).length;
    const done = rows.filter(x => /เสร็จ|จบงาน|เรียบร้อย/.test(val(x.row,"AD")+" "+val(x.row,"S"))).length;
    const cards = [
      ["รายการทั้งหมด", total, "ในหน้าอัพเดตลูกค้า"],
      ["กำลังทำ", working, "อิงคอลัมน์สถานะงานผลิต"],
      ["รอตรวจ Proof", proof, "ติดตามงานที่ต้องตรวจ"],
      ["รอลูกค้า", waiting, "รอข้อมูล / รอแจ้ง / รอตกลง"],
      ["เสร็จ/จบ", done, "พบคำว่าเสร็จหรือจบงาน"],
    ];
    els.stats.innerHTML = cards.map(c => `<div class="stat-card"><div class="stat-label">${esc(c[0])}</div><div class="stat-value">${Number(c[1]).toLocaleString("th-TH")}</div><div class="stat-hint">${esc(c[2])}</div></div>`).join("");
  }

  function renderTable() {
    const list = filteredRows.slice(0, 300);
    els.emptyState.classList.toggle("hidden", list.length > 0);
    els.customerRows.innerHTML = list.map(x => {
      const r=x.row, page=val(r,"CY"), name=val(r,"G") || "(ไม่ระบุชื่อ)", product=val(r,"L"), cat=val(r,"K"), owner=val(r,"R") || "-";
      const pack=getPackage(x);
      return `<tr>
        <td><div class="person"><strong>${esc(name)}</strong><span>${esc(page || val(r,"H") || "-")}</span></div></td>
        <td><div class="person"><strong>${esc(product || "-")}</strong><span>${esc(cat || "-")}</span></div></td>
        <td class="price">${formatPrice(val(r,"M"))}</td>
        <td>${esc(owner)}</td>
        <td>${pill(val(r,"S"))}</td>
        <td>${pill(val(r,"W"))}</td>
        <td>${pill(val(r,"AD"))}</td>
        <td><div class="person"><strong>${esc(pack.name)}</strong><span>${pack.done}/${pack.total || "?"}</span></div></td>
        <td><div class="row-actions"><button class="detail-btn" data-row="${x.rowNumber}">ดูรายละเอียด</button></div></td>
      </tr>`;
    }).join("");
    els.customerRows.querySelectorAll(".detail-btn").forEach(btn => btn.onclick = () => {
      const x = rows.find(r => r.rowNumber === Number(btn.dataset.row)); if (x) openDrawer(x);
    });
  }

  function formatPrice(v) {
    const n=Number(String(v).replace(/,/g,"")); return Number.isFinite(n)&&v!=="" ? `฿${n.toLocaleString("th-TH")}` : (v ? esc(v) : "-");
  }

  function pill(v) {
    if (!v) return `<span class="status-pill">-</span>`;
    const t=norm(v); let cls="";
    if (/เสร็จ|ผ่าน|จบ/.test(t)) cls="green";
    else if (/รอ|ค้าง/.test(t)) cls="yellow";
    else if (/ยกเลิก|ไม่ผ่าน|ปัญหา/.test(t)) cls="red";
    else if (/ทำอยู่|กำลัง/.test(t)) cls="blue";
    return `<span class="status-pill ${cls}" title="${esc(v)}">${esc(v)}</span>`;
  }

  function getPackage(x) {
    if (x.row.__demoPack) return x.row.__demoPack;
    const r=x.row;
    const defs = [
      {marker:"AH", name:"PACK A", total:"AI", done:"AJ"},
      {marker:"AS", name:"PACK B", total:"AT", done:"AU"},
      {marker:"BD", name:"PACK C", total:"BE", done:"BF"},
      {marker:"BO", name:"Content เก่า", total:"BP", done:"BQ"},
      {marker:"BZ", name:"สร้างเพจ", total:"CA", done:"CB"},
      {marker:"CK", name:"วิดีโอ", total:"CL", done:"CM"},
      {marker:"CN", name:"ยิงแอด+ฟรี", total:"CO", done:"CP"},
    ];
    const active = defs.filter(d => val(r,d.marker) || val(r,d.total) || val(r,d.done));
    if (!active.length) return {name:"-",done:0,total:0};
    let total=0, done=0; const names=[];
    active.forEach(d => { names.push(d.name); total += parseNum(val(r,d.total)); done += parseNum(val(r,d.done)); });
    return {name:names.join(" + "), done, total};
  }
  function parseNum(v) { const n=Number(String(v).replace(/,/g,"")); return Number.isFinite(n)?n:0; }

  function openDrawer(x) {
    currentEdit = {
      rowNumber:x.rowNumber,
      originalRow:[...x.row],
      fingerprint:fingerprint(x.row),
      isDemo:x.demo
    };
    const r=x.row;
    els.drawerTitle.textContent = `${val(r,"G") || "ไม่ระบุชื่อ"}${val(r,"CY") ? ` · ${val(r,"CY")}` : ""}`;
    const link=val(r,"CZ");
    els.drawerPageLink.href = link || "#";
    els.drawerPageLink.style.visibility = link ? "visible" : "hidden";
    els.drawerConflict.classList.add("hidden"); els.drawerConflict.textContent="";
    els.drawerBody.innerHTML = drawerHtml(x);
    els.drawer.classList.remove("hidden"); els.drawerBackdrop.classList.remove("hidden"); els.drawer.setAttribute("aria-hidden","false");
    bindDrawerInputs();
    els.saveBtn.disabled = authMode !== "write" || x.demo;
    els.saveBtn.textContent = x.demo ? "Demo — ไม่บันทึก" : "บันทึกเฉพาะที่เปลี่ยน";
  }

  function drawerHtml(x) {
    const r=x.row, pack=getPackage(x); const pct=pack.total ? Math.min(100,Math.round(pack.done/pack.total*100)) : 0;
    const idInfo = [
      ["ชื่อ",val(r,"G")||"-"],["เบอร์",val(r,"H")||"-"],["LINE",val(r,"F")||"-"],["หมวด",val(r,"K")||"-"],
      ["สินค้า/บริการ",val(r,"L")||"-"],["ราคา",formatPrice(val(r,"M"))],["วันที่รับ",val(r,"N")||"-"],["ชื่อเพจ",val(r,"CY")||"-"]
    ];
    const form = EDITABLE_FIELDS.map(f => {
      const value=val(r,f.col), disabled = authMode !== "write" || x.demo ? "disabled" : "";
      if (f.type === "textarea") return `<div class="field full"><label>${esc(f.label)} · ${f.col}</label><textarea data-col="${f.col}" ${disabled}>${esc(value)}</textarea></div>`;
      return `<div class="field"><label>${esc(f.label)} · ${f.col}</label><input data-col="${f.col}" value="${esc(value)}" ${disabled}></div>`;
    }).join("");
    return `
      <div class="readonly-note">ข้อมูลระบุตัวลูกค้า (ชื่อ/เบอร์/สินค้า/เพจ) ถูกล็อกบนเว็บนี้โดยตั้งใจ เพื่อใช้เป็นจุดอ้างอิงเวลามีคนอื่นแทรกหรือแก้แถว หากต้องแก้ข้อมูลกลุ่มนี้ให้กด “เปิดแถวใน Google Sheet”</div>
      <section class="section-card"><h3>ข้อมูลลูกค้า</h3><div class="info-grid">${idInfo.map(i=>`<div class="info-item"><label>${esc(i[0])}</label><div>${i[1]}</div></div>`).join("")}</div></section>
      <section class="section-card"><h3>ความคืบหน้าแพ็ก</h3><div class="package-box"><div><div class="package-name">${esc(pack.name)}</div><div class="subtle">${pack.done} / ${pack.total || "?"} รายการ</div></div><div class="progress"><span style="width:${pct}%"></span></div></div></section>
      <section class="section-card"><h3>ช่องที่แก้ผ่านเว็บได้</h3><div class="form-grid">${form}</div></section>
    `;
  }

  function bindDrawerInputs() {
    els.drawerBody.querySelectorAll("[data-col]").forEach(el => el.addEventListener("input", updateSaveButton));
    updateSaveButton();
  }

  function changedFields() {
    if (!currentEdit) return [];
    const changed=[];
    els.drawerBody.querySelectorAll("[data-col]").forEach(el => {
      const col=el.dataset.col, old=val(currentEdit.originalRow,col), now=el.value.trim();
      if (old !== now) changed.push({col, oldValue:old, newValue:now});
    });
    return changed;
  }

  function updateSaveButton() {
    if (!currentEdit) return;
    const n=changedFields().length;
    els.saveBtn.disabled = authMode !== "write" || currentEdit.isDemo || n === 0;
    if (!currentEdit.isDemo) els.saveBtn.textContent = n ? `บันทึก ${n} ช่องที่เปลี่ยน` : "ไม่มีการเปลี่ยนแปลง";
  }

  function closeDrawer() {
    els.drawer.classList.add("hidden"); els.drawerBackdrop.classList.add("hidden"); els.drawer.setAttribute("aria-hidden","true"); currentEdit=null;
  }

  function fingerprint(row) {
    return FINGERPRINT_COLS.map(c => norm(val(row,c))).join("¦");
  }

  async function saveChanges() {
    const changes = changedFields();
    if (!currentEdit || !changes.length || authMode !== "write") return;
    els.saveBtn.disabled=true; els.saveBtn.textContent="กำลังตรวจข้อมูลล่าสุด...";
    els.drawerConflict.classList.add("hidden");
    try {
      // 1) อ่านชีตใหม่ทั้งหน้า เพื่อไม่ยึด row number เก่าหากมีคนแทรก/ลบแถว
      const matrix = await fetchMatrix();
      const freshRows = matrix.slice(START_ROW-1).map((row,i)=>({row,rowNumber:START_ROW+i}));
      const candidates = freshRows.filter(x => fingerprint(x.row) === currentEdit.fingerprint);
      if (candidates.length !== 1) {
        throwConflict(candidates.length === 0
          ? "หาแถวเดิมไม่พบ เพราะข้อมูลระบุตัวลูกค้าถูกแก้หลังจากคุณเปิดหน้านี้ กรุณารีเฟรชก่อน"
          : "พบข้อมูลที่เหมือนกันมากกว่า 1 แถว จึงไม่บันทึกอัตโนมัติเพื่อป้องกันแก้ผิดแถว");
        return;
      }
      const target=candidates[0];

      // 2) optimistic conflict check: ทุกช่องที่จะเปลี่ยนต้องยังมีค่าเท่ากับตอนที่เปิด drawer
      const conflicts = changes.filter(c => val(target.row,c.col) !== c.oldValue);
      if (conflicts.length) {
        throwConflict(`มีผู้ใช้อื่นแก้ ${conflicts.map(c=>c.col).join(", ")} หลังจากคุณเปิดรายการนี้ ระบบจึงหยุดบันทึก กรุณารีเฟรชแล้วตรวจอีกครั้ง`);
        return;
      }

      // 3) เขียนเฉพาะเซลล์ที่เปลี่ยน ไม่ update ทั้งแถว
      const nonEmpty = changes.filter(c => c.newValue !== "");
      const empty = changes.filter(c => c.newValue === "");
      if (nonEmpty.length) {
        await sheetsFetch(`/values:batchUpdate`, {
          method:"POST",
          body: JSON.stringify({
            valueInputOption:"USER_ENTERED",
            data: nonEmpty.map(c => ({ range:sheetRange(`${c.col}${target.rowNumber}`), majorDimension:"ROWS", values:[[c.newValue]] }))
          })
        });
      }
      if (empty.length) {
        await sheetsFetch(`/values:batchClear`, {
          method:"POST",
          body: JSON.stringify({ ranges: empty.map(c => sheetRange(`${c.col}${target.rowNumber}`)) })
        });
      }
      await loadSheet();
      toast(`บันทึกแล้ว ${changes.length} ช่อง — ไม่แตะเซลล์อื่น`);
      closeDrawer();
    } catch(e) {
      console.error(e); toast(e.message || "บันทึกไม่สำเร็จ", true); updateSaveButton();
    }
  }

  function throwConflict(message) {
    els.drawerConflict.textContent=message;
    els.drawerConflict.classList.remove("hidden");
    els.saveBtn.disabled=true;
    els.saveBtn.textContent="หยุดบันทึกเพื่อป้องกันข้อมูลชน";
  }

  function disableEditMode() {
    authMode = accessToken ? "read" : "demo";
    updateAuthUI();
    if (currentEdit) openDrawer(rows.find(r=>r.rowNumber===currentEdit.rowNumber) || rows[0]);
    toast("กลับเป็นโหมดดูอย่างเดียวแล้ว");
  }

  function updateAuthUI() {
    const email=currentUser?.email ? ` · ${currentUser.email}` : "";
    els.notice.classList.toggle("hidden", authMode !== "demo");
    if (authMode === "demo") {
      els.connectionBadge.className="badge muted"; els.connectionBadge.textContent="Demo";
      els.connectBtn.textContent="เชื่อม Google"; els.editModeText.textContent="ดูอย่างเดียว"; els.editModeBtn.textContent="เปิดโหมดแก้ไข";
    } else if (authMode === "read") {
      els.connectionBadge.className="badge live"; els.connectionBadge.textContent=`Live${email}`;
      els.connectBtn.textContent="เชื่อมแล้ว"; els.editModeText.textContent="ดูอย่างเดียว (ปลอดภัย)"; els.editModeBtn.textContent="เปิดโหมดแก้ไข";
    } else {
      els.connectionBadge.className="badge edit"; els.connectionBadge.textContent=`Edit${email}`;
      els.connectBtn.textContent="เชื่อมแล้ว"; els.editModeText.textContent="แก้ไขเฉพาะช่อง"; els.editModeBtn.textContent="ปิดโหมดแก้ไข";
    }
  }

  function toast(message, isError=false) {
    els.toast.textContent=message;
    els.toast.style.background=isError ? "#a92e3b" : "#162033";
    els.toast.classList.remove("hidden");
    clearTimeout(toast._t); toast._t=setTimeout(()=>els.toast.classList.add("hidden"), 3500);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
