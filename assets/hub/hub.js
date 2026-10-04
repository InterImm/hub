/* InterImm company hub: job fair, registration, Company Office and the register.
   Reads the register from api/hub.json (built by Jekyll from _companies/) and writes
   through the front desk Worker (desk/ in this repo) when window.HUB.desk is set. */
(function () {
  "use strict";

  const HUB = window.HUB || {};
  const STORY_OFFSET_DAYS = 70491;
  const NOW_YEAR = 2219;
  const LIMIT = { jobs: 3, ads: 2, notices: 5 };
  const REGISTRAR = "admin@interimm.org";

  /* ---------------- language ---------------- */
  const qs = new URLSearchParams(location.search);
  const lang = qs.get("lang") === "en" || HUB.lang === "en" ? "en" : "cn";
  const T = {
    cn: {
      heroKicker: "星际移民中心 · 企业登记处", heroTitle: "在火星找工作，或者创办一家招人的公司。",
      heroLede: "移民中心登记在册的星际企业，从端点城的温室农场到奇点城的酿酒厂。来这里找一份工作，登记你自己的企业，并在企业办公室里经营它。",
      desks: "服务台", desk1: "服务台 1", desk2: "服务台 2", desk3: "服务台 3", desk4: "服务台 4",
      fairTab: "招聘会", foundTab: "登记企业", officeTab: "企业办公室", registryTab: "企业登记册",
      fairTitle: "2219 年星际招聘会", fairLede: "回答三个问题，移民中心为你匹配一个职位，写好录用信，并订好你的船票。",
      yourName: "你的名字（印在船票上）", defaultName: "林薇",
      q1: "你擅长什么？", q2: "你想在哪里醒来？", q3: "你愿意冒多大风险？",
      tech: "机器", techS: "修理、驾驶、让一切运转", craft: "种植与制作", craftS: "植物、食物、看得见摸得着的东西",
      data: "数字与信号", dataS: "数据、网络、金融", people: "人与故事", peopleS: "教书、照护、讲述",
      city: "热闹的城市", cityS: "南河城的街道、电车和喧闹", frontier: "边疆穹顶", frontierS: "沙尘、安静、望得很远", orbit: "天上", orbitS: "在轨道上或在航行中",
      low: "稳定合同", lowS: "固定工时，密封走廊", mid: "偶尔沾点沙", midS: "时不时出外勤", high: "什么都行", highS: "只要有故事可讲",
      match: "为我匹配", lucky: "随便来一个",
      letterDear: n => `${n}，您好：`,
      letterBody: (t, city) => `我们很高兴向您提供<strong>${t}</strong>一职，工作地点为本公司${city}办公室。`,
      openApp: "我们一直欢迎这个方向的人才，请把这封信当作邀请。",
      start: "入职", pay: "薪酬", contract: "合同", perSol: "信用点 / 火星日",
      cLow: "两个火星年，可续约", cMid: "一个火星年，含外勤补贴", cHigh: "按考察任务计，含风险津贴",
      letterWait: d => `您的回复需要 ${d} 才能抵达我们这里。我们会等。`,
      hr: "人事部", posted: "公司发布的职位", openAppChip: "开放申请",
      passTitle: "登机牌", passCrew: "船员铺位", passEco: "丽科航运 · 经济舱", earthPort: "地球轨道港",
      passenger: "旅客", departs: "出发", transit: "航程", seat: "座位", days: "天", arrival: "抵达时信号延迟",
      alsoHiring: "也在招人", ratherHire: "想当老板？去登记一家企业",
      noJobs: "目前没有可匹配的职位。",
      foundTitle: "登记企业", foundLede: "填写登记表，移民中心为你签发登记证书。登记处审核通过后，你的企业就会出现在登记册上，之后你可以在企业办公室里自己经营它。",
      fName: "企业名称", fNameEn: "英文名（可选）", fSeat: "所在地", fTrade: "行业", fAbout: "这家企业做什么？", fFounder: "创始人（显示在登记册上的名字）", fLink: "网站（可选）",
      sampleName: "红灯笼茶馆", sampleAbout: "在端点城温室里种茶，在南河城西区的纸灯笼下奉茶。从第一个无尘的小时开到末班电车。",
      submit: "提交登记", submitting: "正在递交……",
      certKicker: "星际移民中心", certTitle: "企业登记证书", certThis: "兹证明", certBody: (seat, region, trade) => `已列入企业登记册，住所设于${seat}（${region}），经营${trade}。`,
      regKey: "登记号", founded: "成立", founder: "创始人", issued: "签发于", registrar: "伊希地办公室 登记官",
      codeTitle: "你的编辑码：只显示这一次", codeHelp: "企业办公室凭这个码确认你是这家企业的主人。请抄下来或截图保存。移民中心不保存它，丢了只能找登记处重新签发。",
      copy: "复制", copied: "已复制", openOffice: "打开企业办公室",
      filedPending: "已递交。登记处审核通过后（通常一两天内），你的企业会出现在登记册上，招聘和广告也能发布了。",
      deskClosed: "在线登记即将开放。你现在可以先预览证书。",
      officeTitle: "企业办公室", officeLede: "创始人在这里经营自己的企业：发布招聘（出现在招聘会上）、刊登广告（出现在分类广告栏）、发布公告（出现在公报上）。",
      loginTitle: "进入你的办公室", loginKey: "登记号", loginCode: "编辑码", remember: "在这台设备上记住我", enter: "进入",
      loginHelp: "登记号在登记证书上，也在登记册里每家企业的详情中。",
      lostCode: `忘了编辑码？写信给登记处 ${REGISTRAR}，附上登记号。我们会通过你登记时留下的私人联系方式核实身份，再签发新码，旧码随即作废。`,
      fContact: "私人联系方式（可选）", fContactHint: "邮箱或微信号。只有登记处能看到，不会出现在网站或代码库里。忘了编辑码时，我们靠它确认是你。",
      saveImage: "保存证书图片", imageHint: "长按或右键即可保存这张图片。它带着你的编辑码，请勿分享。", codeOnCert: "编辑码 · 请勿外传",
      contactChange: "私人联系方式",
      noCode: k => `这家企业还没有编辑码。2026 年以前登记的企业，请写信给登记处 ${REGISTRAR}，附上登记号 ${k} 和当初登记时用的称呼，我们核实后会签发编辑码。`,
      signOut: "退出", pendingReview: "等待审核", registered: "已登记",
      jobsDrawer: "招聘", adsDrawer: "广告", noticesDrawer: "公告", profileDrawer: "资料",
      jobsHelp: "公开的职位会出现在招聘会上。每条持续 30 个火星日，到期前可以续期。", adsHelp: "广告刊登在登记册的分类广告栏，同时最多两条。", noticesHelp: "给公报的简短消息：开业、丰收、新航线。每条一行。", profileHelp: "登记册上显示的企业资料。所在地只能由登记处修改。",
      open: "开放中", expiring: "即将到期", solsLeft: n => `剩 ${n} 个火星日`, renew: "续期 30 个火星日", close: "撤下", withdraw: "撤下", del: "删除",
      postJob: "发布职位", jTitle: "职位名称", jPerk: "为什么值得来", jSkill: "适合", jPlace: "工作环境", jRisk: "风险", jPay: "薪酬（信用点 / 火星日）", addJob: "加入草稿",
      jobsFull: n => `${n} 个名额都已用完。撤下一条再发新的。`,
      placeAd: "刊登广告", aHl: "标题", aBody: "正文（最多 160 字）", addAd: "加入草稿", adsFull: "两个名额都已用完。撤下一条再刊登新的。",
      fileNotice: "发布公告", nText: "公告内容", addNotice: "加入草稿",
      saveProfile: "更新资料",
      unsaved: n => `有 ${n} 处改动尚未保存`, save: "保存到登记册", discard: "放弃改动", saving: "正在保存……",
      saved: "已保存。大约一分钟后在网站上生效。", pendingNoSave: "登记处审核通过后才能发布内容。你可以先写好草稿。",
      noJobsYet: "还没有职位", noAdsYet: "还没有广告", noNoticesYet: "还没有公告",
      ch: { addJob: "新职位", closeJob: "撤下职位", renewJob: "续期职位", addAd: "新广告", pullAd: "撤下广告", renewAd: "续期广告", addNotice: "新公告", delNotice: "删除公告", profile: "更新资料" },
      registryTitle: "企业登记册", registryLede: "所有在移民中心登记的企业。分类广告和公报来自各企业的办公室。",
      classifieds: "本火星日分类广告", noAds: "还没有广告。创始人可以在企业办公室里刊登。",
      chartTitle: "登记在册的成立年份。", chartLegend: `墨色：运营中；铁锈色：预先登记（成立于 ${NOW_YEAR} 年之后）。`, now: "今天",
      search: "搜索", searchPh: "名称、行业或登记人", seatF: "所在地", anywhere: "全部", status: "状态", all: "全部", live: "运营中", future: "预先登记",
      count: (a, b) => `${b} 家企业中的 ${a} 家`, more: "显示更多",
      gazette: "公报", newOnRegister: "新登记", openJobs: "登记册上的开放职位", toFair: "去招聘会",
      record: "查看完整记录", officeOpen: "办公室已开", unclaimed: "尚未认领", claim: "认领", foundedIn: y => `成立于 ${y}`, filedBy: "登记人", seatL: "所在地", noAbout: "没有简介。",
      errors: { code: "编辑码和这家企业对不上。", unknown: "找不到这个登记号。", key: "这不是一个登记号。", turnstile: "人机验证没有通过，请再试一次。", caps: "超过了名额上限。", missing: "还有必填项没填。", too_long: "有一项写得太长了。", link: "网址需要以 http:// 或 https:// 开头。", seat: "请从列表里选择所在地。", unclaimed: "这家企业还没有编辑码。", closed: "在线登记即将开放。", network: "连不上服务台，请稍后再试。" },
    },
    en: {
      heroKicker: "Interplanetary Immigration Center · Company Registry", heroTitle: "Find work on Mars, or found the company that hires.",
      heroLede: "Every company on the Center's register, from greenhouse farms in Terminus to a brewery in Singularity. Get matched with one, register your own, and run it from your Company Office.",
      desks: "Desks", desk1: "DESK 1", desk2: "DESK 2", desk3: "DESK 3", desk4: "DESK 4",
      fairTab: "Job fair", foundTab: "Register a company", officeTab: "Company Office", registryTab: "The register",
      fairTitle: "Job fair, 2219", fairLede: "Answer three questions. The Center matches you to an opening, writes your offer and books your passage.",
      yourName: "Your name, as it should appear on the pass", defaultName: "Lin Wei",
      q1: "What are you good at?", q2: "Where do you want to wake up?", q3: "How much risk will you take?",
      tech: "Machines", techS: "Fixing, flying, keeping things running", craft: "Growing and making", craftS: "Plants, food, things you can hold",
      data: "Numbers and signals", dataS: "Data, networks, money", people: "People and stories", peopleS: "Teaching, caring, telling",
      city: "A busy city", cityS: "Nanhe streets, trams, noise", frontier: "A frontier dome", frontierS: "Dust, quiet, a long view", orbit: "Up above", orbitS: "In orbit or in transit",
      low: "A steady contract", lowS: "Fixed hours, sealed corridors", mid: "Some dust on my boots", midS: "Field days now and then", high: "Anything", highS: "If it pays in stories",
      match: "Match me", lucky: "Surprise me",
      letterDear: n => `Dear ${n},`,
      letterBody: (t, city) => `We are pleased to offer you the position of <strong>${t}</strong> at our ${city} office.`,
      openApp: "We are always glad to hear from people like you; take this letter as an invitation.",
      start: "Start", pay: "Pay", contract: "Contract", perSol: "credits per sol",
      cLow: "Two Mars years, renewable", cMid: "One Mars year, field allowance", cHigh: "Per expedition, hazard bonus",
      letterWait: d => `Your reply will take ${d} to reach us. We will wait.`,
      hr: "Personnel office", posted: "Posted by the company", openAppChip: "Open application",
      passTitle: "Boarding pass", passCrew: "crew berth", passEco: "Ricky Space economy", earthPort: "Earth orbit port",
      passenger: "Passenger", departs: "Departs", transit: "Transit", seat: "Seat", days: "days", arrival: "Signal on arrival",
      alsoHiring: "Also hiring", ratherHire: "Rather hire than be hired? Register a company",
      noJobs: "No openings match right now.",
      foundTitle: "Register a company", foundLede: "Fill in the filing and the Center issues your certificate. Once the registrar approves it, your company is on the register and you run it from your Company Office.",
      fName: "Company name", fNameEn: "English name (optional)", fSeat: "Seat", fTrade: "Trade", fAbout: "What does it do?", fFounder: "Founder (the name shown on the register)", fLink: "Website (optional)",
      sampleName: "红灯笼茶馆", sampleAbout: "Tea grown in Terminus greenhouses, served under paper lanterns on Nanhe's west side. Open from the first dust-free hour until the last tram.",
      submit: "Submit for registration", submitting: "Filing…",
      certKicker: "Interplanetary Immigration Center", certTitle: "Certificate of Registration", certThis: "This certifies that", certBody: (seat, region, trade) => `is entered on the Company Register with its seat in ${seat}, ${region}, to carry on the trade of ${trade}.`,
      regKey: "Register key", founded: "Founded", founder: "Founder", issued: "Issued", registrar: "Registrar, Isidis office",
      codeTitle: "Your edit code: shown only once", codeHelp: "The Company Office uses this code to know the company is yours. Write it down or take a screenshot. The Center does not keep it; if you lose it, the registrar has to issue a new one.",
      copy: "Copy", copied: "Copied", openOffice: "Open your Company Office",
      filedPending: "Filed. Once the registrar approves it (usually within a day or two) your company appears on the register and you can post jobs and ads.",
      deskClosed: "Online registration opens soon. You can preview your certificate now.",
      officeTitle: "Company Office", officeLede: "Founders run their company here: post jobs for the job fair, place ads in the classifieds, and file notices for the gazette.",
      loginTitle: "Enter your office", loginKey: "Register key", loginCode: "Edit code", remember: "Remember me on this device", enter: "Enter",
      loginHelp: "The register key is on your certificate, and on each company's entry in the register.",
      lostCode: `Lost your edit code? Write to the registrar at ${REGISTRAR} with your register key. We check it is you through the private contact you left, then issue a new code; the old one stops working.`,
      fContact: "Private contact (optional)", fContactHint: "Email or WeChat ID. Only the registrar sees it; it never appears on the site or in the repository. If you lose your edit code, this is how we know it is you.",
      saveImage: "Save certificate image", imageHint: "Long-press or right-click to save this image. It carries your edit code, so keep it private.", codeOnCert: "Edit code · keep private",
      contactChange: "Private contact",
      noCode: k => `This company has no edit code yet. If you registered it before 2026, write to the registrar at ${REGISTRAR} with the register key ${k} and the name you filed under; we issue a code once we have checked.`,
      signOut: "Sign out", pendingReview: "Awaiting review", registered: "Registered",
      jobsDrawer: "Jobs", adsDrawer: "Ads", noticesDrawer: "Notices", profileDrawer: "Profile",
      jobsHelp: "Open postings appear at the job fair. Each runs for 30 sols; renew it before it expires.", adsHelp: "Ads run in the register's classifieds, two at a time.", noticesHelp: "Short dispatches for the gazette: openings, harvests, new routes. One line each.", profileHelp: "What the register shows about you. Only the registrar can change your seat.",
      open: "Open", expiring: "Expiring", solsLeft: n => `${n} sols left`, renew: "Renew 30 sols", close: "Close", withdraw: "Withdraw", del: "Delete",
      postJob: "Post a job", jTitle: "Title", jPerk: "Why take it", jSkill: "Good for", jPlace: "Setting", jRisk: "Risk", jPay: "Pay (credits per sol)", addJob: "Add to draft",
      jobsFull: n => `All ${n} slots are in use. Close one to post another.`,
      placeAd: "Place an ad", aHl: "Headline", aBody: "Text (up to 160 characters)", addAd: "Add to draft", adsFull: "Both slots are in use. Withdraw one to place another.",
      fileNotice: "File a notice", nText: "Notice", addNotice: "Add to draft",
      saveProfile: "Update profile",
      unsaved: n => `${n} unsaved change${n === 1 ? "" : "s"}`, save: "Save to the register", discard: "Discard", saving: "Saving…",
      saved: "Saved. Live on the site in about a minute.", pendingNoSave: "You can publish once the registrar approves your company. Drafts are fine until then.",
      noJobsYet: "No openings yet", noAdsYet: "No ads yet", noNoticesYet: "No notices yet",
      ch: { addJob: "New job", closeJob: "Close job", renewJob: "Renew job", addAd: "New ad", pullAd: "Withdraw ad", renewAd: "Renew ad", addNotice: "New notice", delNotice: "Delete notice", profile: "Profile update" },
      registryTitle: "The register", registryLede: "Every company on file with the Center. Classifieds and notices come from the companies' own Offices.",
      classifieds: "Classifieds · this sol", noAds: "No ads yet. Founders place them from the Company Office.",
      chartTitle: "Founding years on file.", chartLegend: `Ink: in operation. Rust: registered in advance, founded after ${NOW_YEAR}.`, now: "now",
      search: "Search", searchPh: "Name, trade or founder", seatF: "Seat", anywhere: "Anywhere", status: "Status", all: "All", live: "In operation", future: "In advance",
      count: (a, b) => `${a} of ${b} companies`, more: "Show more",
      gazette: "Gazette", newOnRegister: "New on the register", openJobs: "Open jobs on the register", toFair: "Go to the job fair",
      record: "Full record", officeOpen: "Office open", unclaimed: "Unclaimed", claim: "Claim", foundedIn: y => `founded ${y}`, filedBy: "Filed by", seatL: "Seat", noAbout: "No description on file.",
      errors: { code: "That edit code does not match this company.", unknown: "No company with that register key.", key: "That is not a register key.", turnstile: "The check did not pass. Please try again.", caps: "That is over the limit.", missing: "A required field is empty.", too_long: "One of the fields is too long.", link: "The link must start with http:// or https://.", seat: "Pick a seat from the list.", unclaimed: "This company has no edit code yet.", closed: "Online registration opens soon.", network: "Could not reach the desk. Please try again later." },
    },
  }[lang];

  /* ---------------- places ---------------- */
  // Matched against the free-text `base` of each company, in this order.
  const PLACES = [
    { k: "nanhe", m: /南河|Procyon/i, cn: "南河城", en: "Nanhe", code: "NHE", region: ["伊希地", "Isidis"], seat: true },
    { k: "betelgeuse", m: /天狼|Betelgeuse/i, cn: "天狼城", en: "Betelgeuse", code: "BTG", region: ["伊希地", "Isidis"], seat: true },
    { k: "sirius", m: /参宿|Sirius/i, cn: "参宿城", en: "Sirius", code: "SRS", region: ["伊希地", "Isidis"], seat: true },
    { k: "horizon", m: /视界|Horizon/i, cn: "视界城", en: "Horizon", code: "HRZ", region: ["子午线", "Meridiani"], seat: true },
    { k: "singularity", m: /奇点|Singularity/i, cn: "奇点城", en: "Singularity", code: "SNG", region: ["子午线", "Meridiani"], seat: true },
    { k: "bolide", m: /星坠|Bolide/i, cn: "星坠城", en: "Bolide", code: "BLD", region: ["子午线", "Meridiani"], seat: true },
    { k: "trantor", m: /川陀|Trantor/i, cn: "川陀城", en: "Trantor", code: "TRN", region: ["希腊平原", "Hellas"], seat: true, frontier: true },
    { k: "terminus", m: /端点|Terminus/i, cn: "端点城", en: "Terminus", code: "TRM", region: ["希腊平原", "Hellas"], seat: true, frontier: true },
    { k: "kroran", m: /楼兰|Kroran/i, cn: "楼兰城", en: "Kroran", code: "KRN", region: ["火星", "Mars"], seat: true, frontier: true },
    { k: "atlantis", m: /亚特兰|Atlantis/i, cn: "亚特兰帝斯城", en: "Atlantis", code: "ATL", region: ["亚马逊平原", "Amazonis"], seat: true, frontier: true },
    { k: "pompeii", m: /庞贝|Pompeii/i, cn: "庞贝城", en: "Pompeii", code: "PMP", region: ["亚马逊平原", "Amazonis"], frontier: true },
    { k: "mars", m: /火星|Mars/i, cn: "火星", en: "Mars", code: "MRS", region: ["火星", "Mars"], frontier: true },
    { k: "moon", m: /月球|月面|Moon|Luna/i, cn: "月球", en: "Moon", code: "LUN", region: ["月球", "Moon"], seat: true, orbit: true },
    { k: "orbit", m: /太空城市|空间站|轨道|Orbit|station/i, cn: "太空城市", en: "Orbit", code: "ORB", region: ["近地空间", "Cislunar space"], seat: true, orbit: true },
    { k: "earth", m: /地球|美国|中国|Earth|USA|China/i, cn: "地球", en: "Earth", code: "EAR", region: ["地球", "Earth"], seat: true },
  ];
  const ELSEWHERE = { k: "elsewhere", cn: "其他", en: "Elsewhere", code: "XXX", region: ["太阳系", "Solar system"] };
  const placeOf = base => PLACES.find(p => p.m.test(base)) || ELSEWHERE;
  const pname = p => (lang === "en" ? p.en : p.cn);
  const TRADES = ["科研", "教育", "运输", "农业", "食品", "能源矿产", "生物科技", "医疗技术", "互联网", "通讯", "投资金融", "休闲娱乐", "艺术", "新闻媒体", "建筑业", "服务业", "旅游观光", "环境保护", "其他"];
  const TRADE_EN = { 科研: "research", 教育: "education", 运输: "transport", 农业: "agriculture", 食品: "food and drink", 能源矿产: "mining and energy", 生物科技: "biotechnology", 医疗技术: "medicine", 互联网: "networks", 通讯: "communications", 投资金融: "finance", 休闲娱乐: "entertainment", 艺术: "the arts", 新闻媒体: "media", 建筑业: "construction", 服务业: "services", 旅游观光: "tourism", 环境保护: "environmental care", 其他: "other work" };
  const tradeName = t => (lang === "en" ? TRADE_EN[t] || t : t);

  /* ---------------- time and signal ---------------- */
  const DEG = Math.PI / 180;
  const storyDate = (d = new Date()) => new Date(d.getTime() + STORY_OFFSET_DAYS * 864e5);
  const jd = d => d.getTime() / 864e5 + 2440587.5;
  function helio(a, e, L, varpi) {
    const M = ((L - varpi) % 360) * DEG; let E = M;
    for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E), w = varpi * DEG;
    return [x * Math.cos(w) - y * Math.sin(w), x * Math.sin(w) + y * Math.cos(w)];
  }
  function signal(d = storyDate()) {
    const T_ = (jd(d) - 2451545) / 36525;
    const ea = helio(1.00000261, 0.01671123, 100.46457166 + 35999.37244981 * T_, 102.93768193);
    const ma = helio(1.52371034, 0.0933941, -4.55343205 + 19140.30268499 * T_, -23.94362959);
    const au = Math.hypot(ma[0] - ea[0], ma[1] - ea[1]);
    const msd = (jd(d) + 69.184 / 86400 - 2451549.5) / 1.0274912517 + 44796 - 0.0009626;
    return { au, delayMin: au * 149597870.7 / 299792.458 / 60, msd };
  }
  const sol = () => Math.floor(signal().msd);
  const fmtNum = n => n.toLocaleString(lang === "en" ? "en-US" : "zh-CN");
  function fmtDelay(m) { const mm = Math.floor(m), ss = Math.round((m - mm) * 60); return lang === "en" ? `${mm} min ${String(ss).padStart(2, "0")} s` : `${mm} 分 ${String(ss).padStart(2, "0")} 秒`; }
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = d => (lang === "en" ? `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${d.getUTCFullYear()} 年 ${d.getUTCMonth() + 1} 月 ${d.getUTCDate()} 日`);
  const today = () => new Date().toISOString().slice(0, 10);
  const daysLeft = iso => Math.max(0, Math.ceil((Date.parse(iso + "T23:59:59Z") - Date.now()) / 864e5));

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 4200); }
  function hash(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h; }
  const first = v => (Array.isArray(v) ? v.find(x => x) || "" : v ?? "");

  /* ---------------- the register ---------------- */
  let REG = [];
  function normalise(c) {
    const base = Array.isArray(c.base) ? c.base.filter(Boolean).join("；") : String(c.base || "");
    const m = String(c.founded ?? "").match(/\d{4}/);
    const year = m ? +m[0] : null;
    const place = placeOf(base);
    return {
      ...c,
      name: String(first(c.name)).trim() || c.key,
      category: String(first(c.category) || ""),
      author: String(first(c.author) || ""),
      about: String(c.about || ""),
      base, year, place,
      status: year && year > NOW_YEAR ? "future" : "live",
      jobs: (c.jobs || []).filter(j => j && j.title && (!j.expires || j.expires >= today())),
      ads: (c.ads || []).filter(a => a && a.headline && (!a.expires || a.expires >= today())),
      notices: (c.notices || []).filter(n => n && n.text),
    };
  }
  function regNo(c) { return `IMC-${String(c.no).padStart(4, "0")}`; }

  /* ---------------- desk (Worker) ---------------- */
  let tsWidget = null;
  function turnstileToken() {
    if (!HUB.sitekey) return Promise.resolve("");
    return new Promise((resolve, reject) => {
      let tries = 0;
      const go = () => {
        if (!window.turnstile) { if (++tries > 60) return reject(Object.assign(new Error(), { code: "turnstile" })); return setTimeout(go, 200); }
        const el = $("#ts");
        if (tsWidget !== null) { try { window.turnstile.remove(tsWidget); } catch {} }
        tsWidget = window.turnstile.render(el, {
          sitekey: HUB.sitekey, language: lang === "en" ? "en" : "zh-cn", appearance: "interaction-only",
          callback: t => { resolve(t); setTimeout(() => { try { window.turnstile.remove(tsWidget); } catch {} tsWidget = null; el.innerHTML = ""; }, 300); },
          "error-callback": () => reject(Object.assign(new Error(), { code: "turnstile" })),
        });
      };
      go();
    });
  }
  async function desk(path, body) {
    if (!HUB.desk) throw Object.assign(new Error(T.errors.closed), { code: "closed" });
    const turnstile = await turnstileToken();
    let res;
    try {
      res = await fetch(HUB.desk.replace(/\/$/, "") + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, turnstile }) });
    } catch { throw Object.assign(new Error(T.errors.network), { code: "network" }); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(T.errors[out.error] || out.message || T.errors.network), { code: out.error });
    return out;
  }
  const errText = e => T.errors[e.code] || e.message || T.errors.network;

  /* ---------------- tabs ---------------- */
  const DESKS = ["fair", "found", "office", "registry"];
  function showTab(id, scroll) {
    $$(".hub-tab").forEach(t => t.setAttribute("aria-selected", String(t.getAttribute("aria-controls") === id)));
    DESKS.forEach(p => ($("#" + p).hidden = p !== id));
    if (id === "registry") renderRegistry();
    if (id === "office") renderOffice();
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search + "#" + id);
    if (scroll) $(".hub-tabs").scrollIntoView({ block: "start", behavior: "smooth" });
  }

  /* ================= desk 1: job fair ================= */
  const answers = { skill: "data", place: "city", risk: "mid" };
  const SKILL_RULES = [
    ["data", /科研|研究|互联网|数据|投资|金融|通讯|咨询|计算|智能|AI/i],
    ["tech", /运输|飞船|航|制造|机|能源|矿|建筑|军事|工程|物流|快递|Robot/i],
    ["craft", /农|食|酿|生物|环境|艺术|奢侈|材料|水/i],
    ["people", /教育|服务|新闻|媒体|娱乐|旅游|医|心理|游戏|房地产/i],
  ];
  // Titles for open applications (companies that have not posted jobs yet), picked per company.
  const ROLES = {
    cn: { tech: ["设备工程师", "导航员", "维修技师", "系统工程师"], craft: ["温室种植员", "配方师", "材料技师", "食品工艺师"], data: ["数据分析师", "研究助理", "网络工程师", "风险分析师"], people: ["客户联络员", "培训讲师", "内容编辑", "社区协调员"] },
    en: { tech: ["Equipment engineer", "Navigator", "Maintenance technician", "Systems engineer"], craft: ["Greenhouse grower", "Recipe developer", "Materials technician", "Food technologist"], data: ["Data analyst", "Research assistant", "Network engineer", "Risk analyst"], people: ["Client liaison", "Trainer", "Content editor", "Community coordinator"] },
  }[lang];
  function openings() {
    const real = [], open = [];
    for (const c of REG) {
      if (c.status !== "live" || c.place.k === "earth" || c.place === ELSEWHERE) continue;
      for (const j of c.jobs) real.push({ c, title: j.title, perk: j.perk, skill: j.skill, place: j.place, risk: j.risk, pay: j.pay, posted: true });
      if (!c.jobs.length) {
        const skill = (SKILL_RULES.find(([, re]) => re.test(c.category)) || ["people"])[0];
        const place = c.place.orbit ? "orbit" : c.place.frontier ? "frontier" : "city";
        const risk = /军事|犯罪|探索|矿|宇宙/.test(c.category) ? "high" : /科研|运输|生物|物流/.test(c.category) ? "mid" : "low";
        open.push({ c, title: ROLES[skill][hash(c.key) % ROLES[skill].length], perk: "", skill, place, risk, pay: 150 + (hash(c.key) % 9) * 10, posted: false });
      }
    }
    return { real, open };
  }
  const score = j => (j.skill === answers.skill ? 3 : 0) + (j.place === answers.place ? 2 : 0) + (j.risk === answers.risk ? 1 : 0) + (j.posted ? 1.5 : 0);
  function match(lucky) {
    const { real, open } = openings();
    const pool = real.concat(open);
    if (!pool.length) { $("#fairResult").innerHTML = `<div class="empty"><p>${esc(T.noJobs)}</p></div>`; return; }
    const ranked = pool.map(j => ({ j, s: score(j) + Math.random() * (lucky ? 8 : 0.9) })).sort((a, b) => b.s - a.s).map(r => r.j);
    renderOffer(ranked[0], ranked.slice(1, 4));
  }
  function renderOffer(job, others) {
    const c = job.c, p = c.place;
    const name = $("#pName").value.trim() || T.defaultName;
    const d = storyDate(), s = signal(d);
    const start = Math.floor(s.msd) + 30 + Math.round(s.au * 40);
    const transit = Math.round(120 + s.au * 60);
    const launch = new Date(d.getTime() + 14 * 864e5);
    const seat = `${(hash(name) % 30) + 4}${"ABCDF"[hash(name) % 5]}`;
    const flight = (c.name_en || c.key).replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase().padEnd(2, "X") + " " + (100 + (hash(c.key + job.title) % 900));
    const contract = { low: T.cLow, mid: T.cMid, high: T.cHigh }[job.risk] || T.cMid;
    $("#fairResult").innerHTML = `
      <article class="letter" aria-label="${esc(T.fairTitle)}">
        <div class="letter-head">
          <div class="letter-co">${esc(c.name)}<small>${esc(c.name_en || "")}${c.name_en ? " · " : ""}${esc(pname(p))}, ${esc(p.region[lang === "en" ? 1 : 0])}</small></div>
          <div class="mono small muted">${fmtDate(d)}<br>Sol ${fmtNum(Math.floor(s.msd))}</div>
        </div>
        <p>${esc(T.letterDear(name))}</p>
        <p>${T.letterBody(esc(job.title), esc(pname(p)))} ${job.posted ? esc(job.perk || "") : esc(T.openApp)}</p>
        <dl>
          <dt>${esc(T.start)}</dt><dd class="mono">Sol ${fmtNum(start)}</dd>
          <dt>${esc(T.pay)}</dt><dd class="mono">${esc(job.pay || 180)} ${esc(T.perSol)}</dd>
          <dt>${esc(T.contract)}</dt><dd>${esc(contract)}</dd>
        </dl>
        <p>${esc(T.letterWait(fmtDelay(s.delayMin)))}</p>
        <div class="row" style="justify-content:space-between">
          <span class="sig">${esc(c.author || T.hr)}</span>
          <span class="chip ${job.posted ? "live" : "dashed"}">${esc(job.posted ? T.posted : T.openAppChip)}</span>
        </div>
      </article>
      <article class="pass" aria-label="${esc(T.passTitle)}">
        <div class="pass-main">
          <div class="pass-top"><span>${esc(T.passTitle)} · ${esc(job.place === "orbit" && job.skill === "tech" ? T.passCrew : T.passEco)}</span><span class="acc">${esc(flight)}</span></div>
          <div class="route">
            <div><div class="code">LEO</div><div class="city">${esc(T.earthPort)}</div></div>
            <div class="line" aria-hidden="true"></div>
            <div style="text-align:right"><div class="code">${esc(p.code)}</div><div class="city">${esc(pname(p))}</div></div>
          </div>
          <div class="pass-grid">
            <div><span>${esc(T.passenger)}</span><b>${esc(name.toUpperCase())}</b></div>
            <div><span>${esc(T.departs)}</span><b>${fmtDate(launch)}</b></div>
            <div><span>${esc(T.transit)}</span><b>${transit} ${esc(T.days)}</b></div>
            <div><span>${esc(T.seat)}</span><b>${seat}</b></div>
          </div>
        </div>
        <div class="pass-stub">
          <div class="pass-grid" style="grid-template-columns:1fr"><div><span>${esc(T.arrival)}</span><b>${fmtDelay(s.delayMin)}</b></div></div>
          <div class="barcode" aria-hidden="true"></div>
        </div>
      </article>
      ${others.length ? `<div class="alt-jobs"><p class="kicker">${esc(T.alsoHiring)}</p>${others.map((j, i) => `<button type="button" data-i="${i}"><span class="t">${esc(j.title)}</span><span class="muted small">${esc(j.c.name)} · ${esc(pname(j.c.place))}</span></button>`).join("")}</div>` : ""}
      <div class="row"><a class="btn btn-ghost" href="${esc(c.url)}">${esc(T.record)}</a><button class="btn btn-ghost" type="button" id="toFound">${esc(T.ratherHire)}</button></div>`;
    $$("#fairResult .alt-jobs button").forEach(b => b.addEventListener("click", () => {
      const j = others[+b.dataset.i];
      renderOffer(j, [job].concat(others.filter(o => o !== j)).slice(0, 3));
    }));
    $("#toFound").addEventListener("click", () => showTab("found", true));
    lastOffer = { job, others };
  }
  let lastOffer = null;
  function buildFair() {
    const opt = (v, s) => `<button class="opt" type="button" data-v="${v}" aria-pressed="false">${esc(T[v])}<small>${esc(T[v + "S"])}</small></button>`;
    $("#fair").innerHTML = `
      <div class="desk-head"><h2>${esc(T.fairTitle)}</h2><p class="muted">${esc(T.fairLede)}</p></div>
      <div class="fair">
        <div class="quiz">
          <label class="field" for="pName">${esc(T.yourName)}<input id="pName" maxlength="28" autocomplete="name" value="${esc(store.get("hub-name", T.defaultName))}"></label>
          <div class="q" data-q="skill"><div class="q-title"><span class="mono">01</span><h3>${esc(T.q1)}</h3></div><div class="opts">${["tech", "craft", "data", "people"].map(v => opt(v)).join("")}</div></div>
          <div class="q" data-q="place"><div class="q-title"><span class="mono">02</span><h3>${esc(T.q2)}</h3></div><div class="opts">${["city", "frontier", "orbit"].map(v => opt(v)).join("")}</div></div>
          <div class="q" data-q="risk"><div class="q-title"><span class="mono">03</span><h3>${esc(T.q3)}</h3></div><div class="opts">${["low", "mid", "high"].map(v => opt(v)).join("")}</div></div>
          <div class="row"><button class="btn btn-primary" id="matchBtn" type="button">${esc(T.match)}</button><button class="btn btn-ghost" id="luckyBtn" type="button">${esc(T.lucky)}</button></div>
        </div>
        <div class="result" id="fairResult" aria-live="polite"></div>
      </div>`;
    $$("#fair .q").forEach(q => {
      const key = q.dataset.q;
      $$(".opt", q).forEach(b => {
        b.setAttribute("aria-pressed", String(b.dataset.v === answers[key]));
        b.addEventListener("click", () => { answers[key] = b.dataset.v; $$(".opt", q).forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
      });
    });
    $("#matchBtn").addEventListener("click", () => match(false));
    $("#luckyBtn").addEventListener("click", () => match(true));
    $("#pName").addEventListener("change", () => { store.set("hub-name", $("#pName").value.trim()); if (lastOffer) renderOffer(lastOffer.job, lastOffer.others); });
  }

  /* ================= desk 2: register ================= */
  let filed = null; // { key, code } after a successful filing
  function buildFound() {
    const seats = PLACES.filter(p => p.seat);
    $("#found").innerHTML = `
      <div class="desk-head"><h2>${esc(T.foundTitle)}</h2><p class="muted">${esc(T.foundLede)}</p></div>
      <div class="found">
        <form id="foundForm" novalidate>
          ${HUB.desk ? "" : `<p class="notice-box">${esc(T.deskClosed)}</p>`}
          <label class="field" for="fName">${esc(T.fName)}<input id="fName" maxlength="60" required value="${esc(T.sampleName)}"></label>
          <label class="field" for="fNameEn">${esc(T.fNameEn)}<input id="fNameEn" maxlength="80" value="Red Lantern Teahouse"></label>
          <div class="two">
            <label class="field" for="fSeat">${esc(T.fSeat)}<select id="fSeat">${seats.map(p => `<option value="${p.k}">${esc(p.cn)} ${esc(p.en)}</option>`).join("")}</select></label>
            <label class="field" for="fTrade">${esc(T.fTrade)}<select id="fTrade">${TRADES.map(t => `<option value="${t}">${esc(t)}${lang === "en" ? " · " + esc(TRADE_EN[t]) : ""}</option>`).join("")}</select></label>
          </div>
          <label class="field" for="fAbout">${esc(T.fAbout)}<textarea id="fAbout" maxlength="600" required>${esc(T.sampleAbout)}</textarea></label>
          <div class="two">
            <label class="field" for="fFounder">${esc(T.fFounder)}<input id="fFounder" maxlength="40" required autocomplete="nickname"></label>
            <label class="field" for="fLink">${esc(T.fLink)}<input id="fLink" maxlength="200" inputmode="url" placeholder="https://"></label>
          </div>
          <label class="field" for="fContact">${esc(T.fContact)}<input id="fContact" maxlength="100" autocomplete="email" spellcheck="false"><span class="small muted">${esc(T.fContactHint)}</span></label>
          <div class="row"><button class="btn btn-primary" type="submit" id="fileBtn">${esc(T.submit)}</button></div>
          <p class="small muted" id="fileErr" role="alert"></p>
        </form>
        <div class="result"><div class="cert" id="cert"></div><div id="codePanel"></div></div>
      </div>`;
    $("#fTrade").value = "食品";
    ["fName", "fNameEn", "fSeat", "fTrade", "fFounder"].forEach(id => $("#" + id).addEventListener("input", renderCert));
    $("#foundForm").addEventListener("submit", fileCompany);
    renderCert();
  }
  function renderCert() {
    const seat = PLACES.find(p => p.k === $("#fSeat").value) || PLACES[0];
    const s = signal();
    const name = $("#fName").value.trim() || "—", nameEn = $("#fNameEn").value.trim();
    const founder = $("#fFounder").value.trim() || "—";
    $("#cert").innerHTML = `<div class="cert-in">
      <p class="kicker">${esc(T.certKicker)}</p>
      <p class="cert-title">${esc(T.certTitle)}</p>
      <p class="muted small">${esc(T.certThis)}</p>
      <p class="cert-name">${esc(name)}${nameEn ? `<br><span style="font-size:0.62em">${esc(nameEn)}</span>` : ""}</p>
      <p class="cert-body">${esc(T.certBody(pname(seat), seat.region[lang === "en" ? 1 : 0], tradeName($("#fTrade").value)))}</p>
      <div class="cert-grid">
        <div><span>${esc(T.regKey)}</span><b>${esc(filed ? filed.key : "—")}</b></div>
        <div><span>${esc(T.founded)}</span><b>Sol ${fmtNum(Math.floor(s.msd))}</b></div>
        <div><span>${esc(T.founder)}</span><b>${esc(founder)}</b></div>
      </div>
      <div class="cert-foot">
        <div class="small muted">${esc(T.issued)} ${fmtDate(storyDate())}<br>${esc(T.registrar)}</div>
        <svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
          <defs><path id="sealPath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0"/></defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="0.8"/>
          <text><textPath href="#sealPath">INTERPLANETARY IMMIGRATION CENTER · REGISTRY ·</textPath></text>
          <text x="50" y="47" text-anchor="middle" style="font-size:9px;letter-spacing:0.5px">REG.</text>
          <text x="50" y="59" text-anchor="middle" style="font-size:11px;letter-spacing:0.5px">${NOW_YEAR}</text>
        </svg>
      </div>
    </div>`;
  }
  async function fileCompany(e) {
    e.preventDefault();
    const err = $("#fileErr"); err.textContent = "";
    const body = { name: $("#fName").value, name_en: $("#fNameEn").value, seat: $("#fSeat").value, trade: $("#fTrade").value, about: $("#fAbout").value, founder: $("#fFounder").value, link: $("#fLink").value, contact: $("#fContact").value };
    if (!body.name.trim() || !body.about.trim() || !body.founder.trim()) { err.textContent = T.errors.missing; return; }
    const btn = $("#fileBtn"); btn.disabled = true; btn.textContent = T.submitting;
    try {
      const out = await desk("/register", body);
      filed = { key: out.key, code: out.code };
      renderCert();
      $("#codePanel").innerHTML = `<div class="codebox">
          <p><b>${esc(T.codeTitle)}</b></p>
          <p class="code" id="theCode">${esc(out.code)}</p>
          <p class="small">${esc(T.codeHelp)}</p>
          <div class="row"><button class="btn btn-ghost btn-sm" type="button" id="copyCode">${esc(T.copy)}</button><a class="btn btn-ghost btn-sm" id="saveCert" download="interimm-${esc(out.key)}.png">${esc(T.saveImage)}</a><button class="btn btn-primary btn-sm" type="button" id="toOffice">${esc(T.openOffice)}</button></div>
          <figure class="cert-image"><img id="certImg" alt="${esc(T.certTitle)}"><figcaption class="small muted">${esc(T.imageHint)}</figcaption></figure>
        </div>
        <p class="notice-box" style="margin-top:1rem">${esc(T.filedPending)}</p>`;
      $("#copyCode").addEventListener("click", ev => copy(out.code, ev.currentTarget));
      try { const png = certImage(out); $("#certImg").src = png; $("#saveCert").href = png; } catch { $("#saveCert").hidden = true; $("#certImg").closest("figure").hidden = true; }
      $("#toOffice").addEventListener("click", () => { session = { key: out.key, code: out.code, company: null, pending: true }; loadOffice(true); showTab("office", true); });
      $("#foundForm").querySelectorAll("input,select,textarea,button").forEach(x => (x.disabled = true));
    } catch (ex) {
      err.textContent = errText(ex);
      btn.disabled = false; btn.textContent = T.submit;
    }
  }
  // The certificate as a picture, edit code included, so founders have something to keep.
  // Plain canvas drawing: WeChat's browser can save an <img> by long-press but not a download.
  function certImage(out) {
    const W = 900, H = 1240, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d"), paper = "#f3eee3", ink = "#1f1c17", red = "#a8432f", grey = "#6d665b";
    const serif = '"Noto Serif SC", "Songti SC", "SimSun", Georgia, serif', mono = '"JetBrains Mono", Menlo, Consolas, monospace';
    g.fillStyle = paper; g.fillRect(0, 0, W, H);
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(36, 36, W - 72, H - 72);
    g.lineWidth = 1; g.strokeRect(48, 48, W - 96, H - 96);
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    const line = (t, y, font, color) => { g.font = font; g.fillStyle = color || ink; g.fillText(t, W / 2, y); };
    const wrap = (t, y, font, maxW, lh) => {
      g.font = font; g.fillStyle = ink;
      const words = /[\u3000-\u9fff]/.test(t) ? Array.from(t) : t.split(/(?<= )/);
      let cur = "";
      for (const w of words) { if (g.measureText(cur + w).width > maxW && cur && !/^[，。、；：！？）」』,.;:!?)]/.test(w)) { g.fillText(cur.trim(), W / 2, y); y += lh; cur = w; } else cur += w; }
      if (cur) { g.fillText(cur.trim(), W / 2, y); y += lh; }
      return y;
    };
    const seat = PLACES.find(p => p.k === $("#fSeat").value) || PLACES[0];
    const name = $("#fName").value.trim(), nameEn = $("#fNameEn").value.trim(), founder = $("#fFounder").value.trim();
    line(T.certKicker.toUpperCase(), 130, `600 22px ${serif}`, red);
    line(T.certTitle, 200, `700 52px ${serif}`);
    line(T.certThis, 262, `24px ${serif}`, grey);
    let y = wrap(name, 340, `700 58px ${serif}`, W - 200, 70);
    if (nameEn) y = wrap(nameEn, y - 6, `italic 30px ${serif}`, W - 200, 40);
    y = wrap(T.certBody(pname(seat), seat.region[lang === "en" ? 1 : 0], tradeName($("#fTrade").value)), y + 24, `26px ${serif}`, W - 220, 40);
    y += 30;
    const rows = [[T.regKey, out.key], [T.founded, "Sol " + fmtNum(Math.floor(signal().msd))], [T.founder, founder], [T.issued, fmtDate(storyDate())]];
    g.textAlign = "left";
    for (const [k, v] of rows) {
      g.font = `20px ${serif}`; g.fillStyle = grey; g.fillText(k, 130, y);
      g.font = `600 24px ${mono}`; g.fillStyle = ink; g.textAlign = "right"; g.fillText(v, W - 130, y); g.textAlign = "left";
      g.strokeStyle = "#cfc6b5"; g.beginPath(); g.moveTo(130, y + 14); g.lineTo(W - 130, y + 14); g.stroke();
      y += 52;
    }
    g.textAlign = "center";
    y += 30;
    g.strokeStyle = red; g.lineWidth = 2; g.setLineDash([10, 6]); g.strokeRect(110, y, W - 220, 150); g.setLineDash([]);
    line(T.codeOnCert, y + 44, `600 22px ${serif}`, red);
    line(out.code, y + 112, `700 46px ${mono}`);
    // the registrar's seal
    const sx = W - 180, sy = H - 160;
    g.strokeStyle = red; g.fillStyle = red; g.lineWidth = 3;
    g.beginPath(); g.arc(sx, sy, 80, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, 54, 0, Math.PI * 2); g.stroke();
    g.font = `600 22px ${serif}`; g.fillText("REG.", sx, sy - 4); g.font = `700 26px ${serif}`; g.fillText(String(NOW_YEAR), sx, sy + 28);
    g.textAlign = "left"; g.fillStyle = grey; g.font = `22px ${serif}`;
    g.fillText(T.registrar, 110, H - 150); g.fillText("interimm.org/hub", 110, H - 116);
    return c.toDataURL("image/png");
  }
  function copy(text, btn) {
    const done = () => { btn.textContent = T.copied; setTimeout(() => (btn.textContent = T.copy), 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => selectCode());
    else selectCode();
  }
  function selectCode() { const el = $("#theCode"); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

  /* ================= desk 3: Company Office ================= */
  let session = store.get("hub-office", null); // { key, code, remember }
  let draft = null, changes = [], drawer = "jobs";
  function startDraft(company) {
    draft = {
      profile: { name: String(first(company.name) || ""), name_en: company.name_en || "", about: company.about || "", link: company.link || "" },
      jobs: (company.jobs || []).filter(j => !j.expires || j.expires >= today()).map(j => ({ ...j })),
      ads: (company.ads || []).filter(a => !a.expires || a.expires >= today()).map(a => ({ ...a })),
      notices: (company.notices || []).map(n => ({ ...n })),
      contact: session.contact || "",
    };
    changes = [];
  }
  async function loadOffice(fromFiling) {
    if (!session) return renderOffice();
    $("#office").setAttribute("aria-busy", "true");
    try {
      const out = await desk("/verify", { key: session.key, code: session.code });
      session.company = out.company; session.pending = out.pending; session.contact = out.contact || "";
      startDraft(out.company);
    } catch (ex) {
      if (!fromFiling) { const msg = errText(ex); session = null; store.set("hub-office", null); renderOffice(msg); return; }
      session.company = { name: $("#fName") ? $("#fName").value : session.key, jobs: [], ads: [], notices: [] };
      session.pending = true; startDraft(session.company);
    } finally { $("#office").removeAttribute("aria-busy"); }
    renderOffice();
  }
  function renderOffice(error) {
    const root = $("#office");
    const head = `<div class="desk-head"><h2>${esc(T.officeTitle)}</h2><p class="muted">${esc(T.officeLede)}</p></div>`;
    if (!session || !session.company) {
      const pre = qs.get("co") || (session && session.key) || "";
      const known = REG.find(c => c.key === pre);
      root.innerHTML = `${head}
        <form class="login panel" id="loginForm" novalidate>
          <h3>${esc(T.loginTitle)}</h3>
          ${known ? `<p><b>${esc(known.name)}</b> <span class="muted small">${esc(regNo(known))}</span></p>` : ""}
          ${known && !known.office ? `<p class="notice-box warn">${esc(T.noCode(known.key))}</p>` : ""}
          ${HUB.desk ? "" : `<p class="notice-box">${esc(T.deskClosed)}</p>`}
          <label class="field" for="lKey">${esc(T.loginKey)}<input id="lKey" value="${esc(pre)}" autocomplete="username" spellcheck="false" placeholder="company-…"></label>
          <label class="field" for="lCode">${esc(T.loginCode)}<input id="lCode" autocomplete="current-password" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"></label>
          <label class="check" for="lRemember"><input type="checkbox" id="lRemember"> ${esc(T.remember)}</label>
          <div class="row"><button class="btn btn-primary" type="submit" id="lBtn">${esc(T.enter)}</button></div>
          <p class="small muted">${esc(T.loginHelp)}</p>
          <p class="small muted">${esc(T.lostCode)}</p>
          <p class="small" role="alert" id="lErr" style="color:var(--accent)">${esc(error || "")}</p>
        </form>`;
      $("#loginForm").addEventListener("submit", async e => {
        e.preventDefault();
        const key = $("#lKey").value.trim(), code = $("#lCode").value.trim();
        if (!key || !code) { $("#lErr").textContent = T.errors.missing; return; }
        $("#lBtn").disabled = true;
        session = { key, code, remember: $("#lRemember").checked };
        if (session.remember) store.set("hub-office", { key, code, remember: true });
        await loadOffice(false);
      });
      return;
    }
    const c = session.company, d = draft;
    const known = REG.find(x => x.key === session.key);
    const counts = { jobs: d.jobs.length, ads: d.ads.length, notices: d.notices.length };
    root.innerHTML = `${head}
      <div class="office">
        <aside class="office-side">
          <div class="co-card panel">
            <p class="name">${esc(d.profile.name)}</p>
            ${d.profile.name_en ? `<p class="small muted">${esc(d.profile.name_en)}</p>` : ""}
            <div class="row"><span class="chip ${session.pending ? "future" : "live"}">${esc(session.pending ? T.pendingReview : T.registered)}</span>${known ? `<span class="chip">${esc(pname(known.place))}</span>` : ""}</div>
            <p class="small muted mono">${esc(known ? regNo(known) + " · " : "")}${esc(session.key)}</p>
            <button class="btn btn-ghost btn-sm" type="button" id="signOut">${esc(T.signOut)}</button>
          </div>
          <div class="drawers" role="tablist">
            ${[["jobs", T.jobsDrawer, `${counts.jobs}/${LIMIT.jobs}`], ["ads", T.adsDrawer, `${counts.ads}/${LIMIT.ads}`], ["notices", T.noticesDrawer, String(counts.notices)], ["profile", T.profileDrawer, " "]]
              .map(([k, label, n]) => `<button class="drawer" role="tab" type="button" data-d="${k}" aria-selected="${drawer === k}">${esc(label)} <span class="mono">${esc(n)}</span></button>`).join("")}
          </div>
        </aside>
        <div class="office-main" id="officeMain"></div>
      </div>`;
    $("#signOut").addEventListener("click", () => { session = null; draft = null; store.set("hub-office", null); renderOffice(); });
    $$("#office .drawer").forEach(b => b.addEventListener("click", () => { drawer = b.dataset.d; renderOffice(); }));
    renderDrawer();
  }
  const meter = (n, max) => `<span class="meter" aria-label="${n}/${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</span>`;
  function pendingHtml() {
    if (!changes.length) return session.pending ? `<p class="notice-box">${esc(T.pendingNoSave)}</p>` : "";
    return `<div class="pending">
      <div class="item-head"><h3>${esc(T.unsaved(changes.length))}</h3></div>
      <ul>${changes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      ${session.pending ? `<p class="small">${esc(T.pendingNoSave)}</p>` : ""}
      <div class="row"><button class="btn btn-primary" type="button" id="saveBtn" ${session.pending ? "disabled" : ""}>${esc(T.save)}</button><button class="btn btn-ghost btn-sm" type="button" id="discardBtn">${esc(T.discard)}</button></div>
      <p class="small" role="alert" id="saveErr" style="color:var(--accent)"></p>
    </div>`;
  }
  const change = (kind, what) => { changes.push(`${T.ch[kind]}: ${what}`); renderOffice(); };
  const sel = (id, vals, cur) => `<select id="${id}">${vals.map(v => `<option value="${v}" ${v === cur ? "selected" : ""}>${esc(T[v])}</option>`).join("")}</select>`;
  function renderDrawer() {
    const m = $("#officeMain"), d = draft;
    if (drawer === "jobs") {
      const full = d.jobs.length >= LIMIT.jobs;
      m.innerHTML = `<div class="item-head"><div><h3>${esc(T.jobsDrawer)}</h3><p class="small muted">${esc(T.jobsHelp)}</p></div>${meter(d.jobs.length, LIMIT.jobs)}</div>
        ${pendingHtml()}
        ${d.jobs.map((j, i) => { const left = j.expires ? daysLeft(j.expires) : 31; return `<div class="item"><div class="item-head"><h3>${esc(j.title)}</h3><span class="chip ${left > 7 ? "live" : "future"}">${esc(left > 7 ? T.open : T.expiring)} · ${esc(T.solsLeft(left))}</span></div>
          ${j.perk ? `<p class="small muted">${esc(j.perk)}</p>` : ""}<p class="small muted mono">${esc(j.pay || 180)} cr/sol · ${esc(T[j.skill] || "")} · ${esc(T[j.place] || "")} · ${esc(T[j.risk] || "")}</p>
          <div class="row">${j.id ? `<button class="btn btn-ghost btn-sm" type="button" data-renew="${i}" ${j.renew ? "disabled" : ""}>${esc(T.renew)}</button>` : ""}<button class="btn btn-ghost btn-sm" type="button" data-close="${i}">${esc(T.close)}</button></div></div>`; }).join("") || `<div class="empty"><h3>${esc(T.noJobsYet)}</h3></div>`}
        <form class="panel add-form" id="jobForm" novalidate><h3>${esc(T.postJob)}</h3>
          <label class="field" for="jTitle">${esc(T.jTitle)}<input id="jTitle" maxlength="60" ${full ? "disabled" : ""}></label>
          <label class="field" for="jPerk">${esc(T.jPerk)}<input id="jPerk" maxlength="140" ${full ? "disabled" : ""}></label>
          <div class="two"><label class="field" for="jSkill">${esc(T.jSkill)}${sel("jSkill", ["tech", "craft", "data", "people"], "people")}</label><label class="field" for="jPlace">${esc(T.jPlace)}${sel("jPlace", ["city", "frontier", "orbit"], "city")}</label></div>
          <div class="two"><label class="field" for="jRisk">${esc(T.jRisk)}${sel("jRisk", ["low", "mid", "high"], "mid")}</label><label class="field" for="jPay">${esc(T.jPay)}<input id="jPay" type="number" min="50" max="500" value="180" ${full ? "disabled" : ""}></label></div>
          <div class="row"><button class="btn btn-primary" type="submit" ${full ? "disabled" : ""}>${esc(T.addJob)}</button>${full ? `<span class="small muted">${esc(T.jobsFull(LIMIT.jobs))}</span>` : ""}</div>
        </form>`;
      $$("[data-renew]", m).forEach(b => b.addEventListener("click", () => { const j = d.jobs[+b.dataset.renew]; j.renew = true; change("renewJob", j.title); }));
      $$("[data-close]", m).forEach(b => b.addEventListener("click", () => { const [j] = d.jobs.splice(+b.dataset.close, 1); change("closeJob", j.title); }));
      $("#jobForm").addEventListener("submit", e => {
        e.preventDefault(); const t = $("#jTitle").value.trim(); if (!t) return $("#jTitle").focus();
        d.jobs.push({ title: t, perk: $("#jPerk").value.trim(), skill: $("#jSkill").value, place: $("#jPlace").value, risk: $("#jRisk").value, pay: +$("#jPay").value || 180 });
        change("addJob", t);
      });
    } else if (drawer === "ads") {
      const full = d.ads.length >= LIMIT.ads;
      m.innerHTML = `<div class="item-head"><div><h3>${esc(T.adsDrawer)}</h3><p class="small muted">${esc(T.adsHelp)}</p></div>${meter(d.ads.length, LIMIT.ads)}</div>
        ${pendingHtml()}
        ${d.ads.length ? `<div class="classifieds" style="margin:0">${d.ads.map((a, i) => `<div class="ad"><span class="by">${esc(d.profile.name)}</span><p class="hl">${esc(a.headline)}</p><p>${esc(a.body || "")}</p><div class="row">${a.id ? `<button class="btn btn-ghost btn-sm" type="button" data-renew="${i}" ${a.renew ? "disabled" : ""}>${esc(T.renew)}</button>` : ""}<button class="btn btn-ghost btn-sm" type="button" data-pull="${i}">${esc(T.withdraw)}</button></div></div>`).join("")}</div>` : `<div class="empty"><h3>${esc(T.noAdsYet)}</h3></div>`}
        <form class="panel add-form" id="adForm" novalidate><h3>${esc(T.placeAd)}</h3>
          <label class="field" for="aHl">${esc(T.aHl)}<input id="aHl" maxlength="40" ${full ? "disabled" : ""}></label>
          <label class="field" for="aBody">${esc(T.aBody)}<textarea id="aBody" maxlength="160" ${full ? "disabled" : ""}></textarea></label>
          <div class="row"><button class="btn btn-primary" type="submit" ${full ? "disabled" : ""}>${esc(T.addAd)}</button>${full ? `<span class="small muted">${esc(T.adsFull)}</span>` : ""}</div>
        </form>`;
      $$("[data-renew]", m).forEach(b => b.addEventListener("click", () => { const a = d.ads[+b.dataset.renew]; a.renew = true; change("renewAd", a.headline); }));
      $$("[data-pull]", m).forEach(b => b.addEventListener("click", () => { const [a] = d.ads.splice(+b.dataset.pull, 1); change("pullAd", a.headline); }));
      $("#adForm").addEventListener("submit", e => {
        e.preventDefault(); const hl = $("#aHl").value.trim(); if (!hl) return $("#aHl").focus();
        d.ads.push({ headline: hl, body: $("#aBody").value.trim() }); change("addAd", hl);
      });
    } else if (drawer === "notices") {
      m.innerHTML = `<div class="item-head"><div><h3>${esc(T.noticesDrawer)}</h3><p class="small muted">${esc(T.noticesHelp)}</p></div></div>
        ${pendingHtml()}
        ${d.notices.map((n, i) => `<div class="item"><div class="item-head"><h3>${esc(n.text)}</h3><span class="chip">${esc(n.date || "")}</span></div><div class="row"><button class="btn btn-ghost btn-sm" type="button" data-del="${i}">${esc(T.del)}</button></div></div>`).join("") || `<div class="empty"><h3>${esc(T.noNoticesYet)}</h3></div>`}
        <form class="panel add-form" id="noteForm" novalidate><h3>${esc(T.fileNotice)}</h3>
          <label class="field" for="nT">${esc(T.nText)}<input id="nT" maxlength="120"></label>
          <div class="row"><button class="btn btn-primary" type="submit">${esc(T.addNotice)}</button></div>
        </form>`;
      $$("[data-del]", m).forEach(b => b.addEventListener("click", () => { const [n] = d.notices.splice(+b.dataset.del, 1); change("delNotice", n.text); }));
      $("#noteForm").addEventListener("submit", e => {
        e.preventDefault(); const t = $("#nT").value.trim(); if (!t) return $("#nT").focus();
        d.notices.unshift({ text: t }); if (d.notices.length > LIMIT.notices) d.notices.length = LIMIT.notices; change("addNotice", t);
      });
    } else {
      m.innerHTML = `<div class="item-head"><div><h3>${esc(T.profileDrawer)}</h3><p class="small muted">${esc(T.profileHelp)}</p></div></div>
        ${pendingHtml()}
        <form class="panel add-form" id="profForm" novalidate>
          <label class="field" for="pN">${esc(T.fName)}<input id="pN" maxlength="60" value="${esc(d.profile.name)}"></label>
          <label class="field" for="pEn">${esc(T.fNameEn)}<input id="pEn" maxlength="80" value="${esc(d.profile.name_en)}"></label>
          <label class="field" for="pAbout">${esc(T.fAbout)}<textarea id="pAbout" maxlength="600">${esc(d.profile.about)}</textarea></label>
          <label class="field" for="pLink">${esc(T.fLink)}<input id="pLink" maxlength="200" value="${esc(d.profile.link)}"></label>
          <label class="field" for="pContact">${esc(T.contactChange)}<input id="pContact" maxlength="100" spellcheck="false" value="${esc(d.contact)}"><span class="small muted">${esc(T.fContactHint)}</span></label>
          <div class="row"><button class="btn btn-primary" type="submit">${esc(T.saveProfile)}</button></div>
        </form>`;
      $("#profForm").addEventListener("submit", e => {
        e.preventDefault();
        Object.assign(d.profile, { name: $("#pN").value.trim() || d.profile.name, name_en: $("#pEn").value.trim(), about: $("#pAbout").value.trim(), link: $("#pLink").value.trim() });
        const contact = $("#pContact").value.trim();
        if (contact !== d.contact) { d.contact = contact; d.contactChanged = true; }
        d.profileChanged = true; change("profile", d.profile.name);
      });
    }
    const save = $("#saveBtn");
    if (save) {
      save.addEventListener("click", saveOffice);
      $("#discardBtn").addEventListener("click", () => { startDraft(session.company); renderOffice(); });
    }
  }
  async function saveOffice() {
    const btn = $("#saveBtn"); btn.disabled = true; btn.textContent = T.saving;
    const strip = ({ title, perk, skill, place, risk, pay, id, renew, headline, body, text }) => ({ title, perk, skill, place, risk, pay, id, renew, headline, body, text });
    const body = { key: session.key, code: session.code, jobs: draft.jobs.map(strip), ads: draft.ads.map(strip), notices: draft.notices.map(strip) };
    if (draft.profileChanged) body.profile = draft.profile;
    if (draft.contactChanged) body.contact = draft.contact;
    try {
      const out = await desk("/update", body);
      session.company = out.company; session.contact = out.contact || ""; startDraft(out.company);
      toast(T.saved);
      // reflect the change on this page straight away, before Pages rebuilds
      const i = REG.findIndex(c => c.key === session.key);
      if (i >= 0) REG[i] = normalise({ ...REG[i], ...out.company, key: REG[i].key, url: REG[i].url, office: true, no: REG[i].no });
      renderOffice();
    } catch (ex) {
      btn.disabled = false; btn.textContent = T.save;
      $("#saveErr").textContent = errText(ex);
    }
  }

  /* ================= desk 4: the register ================= */
  let shown = 30;
  function buildRegistry() {
    const worlds = PLACES.concat([ELSEWHERE]).filter(p => REG.some(c => c.place === p));
    $("#registry").innerHTML = `
      <div class="desk-head"><h2>${esc(T.registryTitle)}</h2><p class="muted">${esc(T.registryLede)}</p></div>
      <p class="kicker" style="margin-bottom:0.6rem">${esc(T.classifieds)}</p>
      <div class="classifieds" id="classifieds"></div>
      <div class="reg-grid">
        <div>
          <div class="timeline panel" id="timeline"></div>
          <div class="filters">
            <label class="field" for="rq">${esc(T.search)}<input id="rq" placeholder="${esc(T.searchPh)}" autocomplete="off"></label>
            <label class="field" for="rw">${esc(T.seatF)}<select id="rw"><option value="">${esc(T.anywhere)}</option>${worlds.map(p => `<option value="${p.k}">${esc(p.cn)}${lang === "en" ? " " + esc(p.en) : ""}</option>`).join("")}</select></label>
            <label class="field" for="rs">${esc(T.status)}<select id="rs"><option value="">${esc(T.all)}</option><option value="live">${esc(T.live)}</option><option value="future">${esc(T.future)}</option></select></label>
          </div>
          <p class="small muted" id="rCount" style="margin-bottom:0.5rem"></p>
          <div class="reg-list" id="regList"></div>
          <button class="btn btn-ghost" id="moreBtn" type="button" style="margin-top:1rem">${esc(T.more)}</button>
        </div>
        <aside><p class="kicker" style="margin-bottom:0.8rem">${esc(T.gazette)}</p><div class="gazette" id="gazette"></div></aside>
      </div>`;
    ["rq", "rw", "rs"].forEach(id => $("#" + id).addEventListener("input", () => { shown = 30; filterList(); }));
    $("#moreBtn").addEventListener("click", () => { shown += 60; filterList(); });
    renderTimeline();
  }
  function renderRegistry() {
    const ads = REG.flatMap(c => c.ads.map(a => ({ c, a }))).sort((x, y) => String(y.a.posted || "").localeCompare(String(x.a.posted || ""))).slice(0, 4);
    $("#classifieds").innerHTML = ads.length ? ads.map(({ c, a }) => `<div class="ad"><a class="by" href="${esc(c.url)}">${esc(c.name)}</a><p class="hl">${esc(a.headline)}</p><p>${esc(a.body || "")}</p></div>`).join("") : `<div class="ad"><p>${esc(T.noAds)}</p></div>`;
    const notes = REG.flatMap(c => c.notices.map(n => ({ c, date: n.date || "", text: n.text })))
      .concat(REG.filter(c => c.date).map(c => ({ c, date: c.date, text: T.newOnRegister + (lang === "en" ? ": " : "：") + c.name, isNew: true })))
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const jobsOpen = REG.reduce((n, c) => n + c.jobs.length, 0);
    $("#gazette").innerHTML = notes.map(n => `<div class="note"><span class="small muted mono">${esc(n.date)} · ${esc(pname(n.c.place))}</span><b>${esc(n.text)}</b>${n.isNew ? "" : `<a class="small muted" href="${esc(n.c.url)}">${esc(n.c.name)}</a>`}</div>`).join("") +
      `<div class="note"><span class="small muted">${esc(T.openJobs)}</span><b class="mono">${jobsOpen}</b><button class="btn btn-ghost btn-sm" type="button" id="gzFair">${esc(T.toFair)}</button></div>`;
    $("#gzFair").addEventListener("click", () => showTab("fair", true));
    filterList();
  }
  function renderTimeline() {
    const bins = {};
    REG.forEach(c => { if (!c.year) return; const b = Math.max(1800, Math.min(2600, Math.floor(c.year / 25) * 25)); bins[b] = (bins[b] || 0) + 1; });
    const W = 640, H = 120, P = 22, x = y => P + (y - 1800) / 825 * (W - 2 * P), maxN = Math.max(1, ...Object.values(bins));
    const bars = Object.entries(bins).map(([b, n]) => {
      const h = Math.max(2, Math.sqrt(n / maxN) * (H - 46));
      return `<rect x="${x(+b) + 1}" y="${H - 22 - h}" width="${(W - 2 * P) / 33 - 2}" height="${h}" fill="${+b > NOW_YEAR ? "var(--accent)" : "var(--text)"}" opacity="0.8"><title>${b}–${+b + 24}: ${n}</title></rect>`;
    }).join("");
    const ticks = [1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600].map(t => `<text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}</text>`).join("");
    $("#timeline").innerHTML = `<p class="small" style="margin-bottom:0.4rem"><b>${esc(T.chartTitle)}</b> <span class="muted">${esc(T.chartLegend)}</span></p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(T.chartTitle)}">
        <line x1="${P}" x2="${W - P}" y1="${H - 22}" y2="${H - 22}" stroke="var(--border)"/>
        ${bars}
        <line x1="${x(NOW_YEAR)}" x2="${x(NOW_YEAR)}" y1="6" y2="${H - 22}" stroke="var(--accent)" stroke-dasharray="3 3"/>
        <text x="${x(NOW_YEAR) + 4}" y="14" style="fill:var(--accent)">${esc(T.now)} · ${NOW_YEAR}</text>
        ${ticks}
      </svg>`;
  }
  function filterList() {
    const q = $("#rq").value.trim().toLowerCase(), w = $("#rw").value, st = $("#rs").value;
    const rows = REG.filter(c => (!w || c.place.k === w) && (!st || c.status === st) && (!q || `${c.name} ${c.name_en || ""} ${c.category} ${c.author} ${c.base}`.toLowerCase().includes(q)));
    $("#rCount").textContent = T.count(rows.length, REG.length);
    $("#regList").innerHTML = rows.slice(0, shown).map(c => `
      <details class="entry"><summary><span class="no">${esc(regNo(c))}</span><span><span class="nm">${esc(c.name)}</span><br><span class="meta">${esc(c.category)} · ${esc(pname(c.place))}${c.year ? " · " + esc(T.foundedIn(c.year)) : ""}</span></span><span class="chip ${c.status}">${esc(c.status === "future" ? T.future : T.live)}</span></summary>
        <div class="body"><p>${esc(c.about) || `<span class="muted">${esc(T.noAbout)}</span>`}</p>
          <p class="small muted">${esc(T.seatL)}${lang === "en" ? ": " : "："}${esc(c.base)}${c.author ? ` · ${esc(T.filedBy)}${lang === "en" ? ": " : "："}${esc(c.author)}` : ""}</p>
          <div class="row"><a class="btn btn-ghost btn-sm" href="${esc(c.url)}">${esc(T.record)}</a>
            ${c.office ? `<span class="chip live">${esc(T.officeOpen)} · ${c.jobs.length}</span>` : `<span class="chip dashed">${esc(T.unclaimed)}</span><a class="btn btn-ghost btn-sm" href="?${lang === "en" ? "lang=en&" : ""}co=${encodeURIComponent(c.key)}#office">${esc(T.claim)}</a>`}
          </div></div></details>`).join("");
    $("#moreBtn").hidden = rows.length <= shown;
  }

  /* ================= start ================= */
  async function start() {
    $$("[data-t]").forEach(el => (el.textContent = T[el.dataset.t] || ""));
    $$("[data-t-label]").forEach(el => el.setAttribute("aria-label", T[el.dataset.tLabel] || ""));
    $$(".hub-tab").forEach(t => t.addEventListener("click", () => showTab(t.getAttribute("aria-controls"))));
    try {
      const res = await fetch(`${HUB.base}/api/hub.json`, { cache: "no-cache" });
      const data = await res.json();
      REG = data.companies.map(normalise)
        .sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")) || a.key.localeCompare(b.key));
      REG.forEach((c, i) => (c.no = i + 1));
    } catch (e) { console.error(e); REG = []; }
    buildFair(); buildFound(); buildRegistry();
    match(false);
    const hashTab = location.hash.slice(1);
    showTab(DESKS.includes(hashTab) ? hashTab : qs.get("co") ? "office" : "fair");
    if (session && session.remember && !qs.get("co")) loadOffice(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
