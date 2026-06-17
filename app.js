const lostSignals = [
  {
    domain: "nguyetntm5",
    description: "bình nước đen hydro flask có sticker bạc",
    keywords: ["bình", "nuoc", "nước", "den", "đen", "hydro", "flask", "sticker", "bac", "bạc"],
  },
  {
    domain: "linhtt12",
    description: "tai nghe sony màu trắng, hộp sạc có vết xước",
    keywords: ["tai", "nghe", "sony", "trang", "trắng", "hop", "hộp", "sac", "sạc"],
  },
  {
    domain: "anpd8",
    description: "áo khoác xám uniqlo quên ở training room",
    keywords: ["ao", "áo", "khoac", "khoác", "xam", "xám", "uniqlo", "training"],
  },
];

lostSignals.length = 0;

const state = {
  mode: "start",
  flow: null,
  data: {},
};

const userMemory = {
  domain: "",
  searches: [],
  interests: [],
};

const authMemory = loadAuthMemory();
const radarMemory = loadRadarMemory();
sanitizeRadarMemory();

const defaultMarketItems = [
  {
    name: "Túi giữ nhiệt VNG",
    price: "150,000đ",
    quantity: "1",
    description: "Túi giữ nhiệt VNG còn mới, phù hợp mang cơm hoặc đồ uống lạnh.",
    link: "https://vng.com.vn",
    contact: "minhtran",
    status: "Đã duyệt",
    stockStatus: "Còn hàng",
    careCount: 0,
    caredBy: [],
    editCount: 0,
    edited: false,
    image: "assets/demo-product-1.jpg",
  },
  {
    name: "Card bo góc Miu Lê",
    price: "5,000đ",
    quantity: "8",
    description: "Card bo góc Miu Lê, pass lại cho Starter sưu tầm.",
    link: "",
    contact: "nguyetntm5",
    status: "Đã duyệt",
    stockStatus: "Còn hàng",
    careCount: 0,
    caredBy: [],
    editCount: 0,
    edited: false,
    image: "assets/demo-product-2.jpg",
  },
];

const marketState = loadMarketState();
const marketItems = marketState.marketItems;
const pendingItems = marketState.pendingItems;
let notificationCount = 0;
let typingTimer = 0;
let audioContext = null;
let editingMarketIndex = null;
let marketSearchQuery = "";
let launchWizardStep = 0;
let launchWizardData = {};

const launchWizardSteps = [
  {
    key: "name",
    question: "Bạn muốn pass lại món gì?",
    placeholder: "Ví dụ: Bình giữ nhiệt VNG",
  },
  {
    key: "quantity",
    question: "Số lượng món này là bao nhiêu?",
    placeholder: "Ví dụ: 1",
  },
  {
    key: "description",
    question: "Bạn miêu tả chi tiết giúp mình nha: màu sắc, tình trạng, điểm nổi bật... Link thông tin có thể để kèm nếu có.",
    placeholder: "Ví dụ: màu cam, còn mới, có link...",
  },
  {
    key: "price",
    question: "Giá hữu nghị cho Starter là bao nhiêu?",
    placeholder: "Ví dụ: 150,000",
  },
  {
    key: "contact",
    question: "Cách thức liên hệ của bạn là gì? Bạn có thể điền domain hoặc số điện thoại.",
    placeholder: "Ví dụ: nguyetntm5",
  },
  {
    key: "image",
    question: "Bạn đính kèm ảnh vật phẩm nha. Có ảnh thì món đồ mới bay lên phiên chợ được.",
    placeholder: "",
  },
];

const loginPanel = document.querySelector("#loginPanel");
const loginForm = document.querySelector("#loginForm");
const loginDomain = document.querySelector("#loginDomain");
const loginPassword = document.querySelector("#loginPassword");
const loginStatus = document.querySelector("#loginStatus");
const moonText = document.querySelector("#moonText");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatImage = document.querySelector("#chatImage");
const choiceRail = document.querySelector("#choiceRail");
const signalStats = document.querySelector("#signalStats");
const marketGrid = document.querySelector("#marketGrid");
const marketSearchForm = document.querySelector("#marketSearchForm");
const marketSearchInput = document.querySelector("#marketSearchInput");
const marketSearchStatus = document.querySelector("#marketSearchStatus");
const marketForm = document.querySelector("#marketForm");
const marketName = document.querySelector("#marketName");
const marketQuantity = document.querySelector("#marketQuantity");
const marketDescription = document.querySelector("#marketDescription");
const marketPrice = document.querySelector("#marketPrice");
const marketImage = document.querySelector("#marketImage");
const marketStockStatus = document.querySelector("#marketStockStatus");
const marketContact = document.querySelector("#marketContact");
const launchPanel = document.querySelector("#launchPanel");
const launchStatus = document.querySelector("#launchStatus");
const launchTitle = document.querySelector(".form-heading h3");
const launchSubmit = document.querySelector(".submit-launch");
const launchWizard = document.querySelector("#launchWizard");
const launchWizardMessages = document.querySelector("#launchWizardMessages");
const launchWizardInput = document.querySelector("#launchWizardInput");
const launchWizardNext = document.querySelector("#launchWizardNext");
const notificationPanel = document.querySelector("#notificationPanel");
const notificationList = document.querySelector("#notificationList");
const notificationBadge = document.querySelector("#notificationBadge");
const adminPanel = document.querySelector("#adminPanel");
const adminList = document.querySelector("#adminList");
const openAdminPanel = document.querySelector("#openAdminPanel");
const detailPanel = document.querySelector("#detailPanel");
const detailTitle = document.querySelector("#detailTitle");
const detailContent = document.querySelector("#detailContent");
const backToTop = document.querySelector("#backToTop");

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function loadRadarMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem("starterGalaxyRadar")) || {
      lostReports: [],
      foundReports: [],
      notifications: [],
    };
    return {
      lostReports: Array.isArray(parsed.lostReports) ? parsed.lostReports : [],
      foundReports: Array.isArray(parsed.foundReports) ? parsed.foundReports : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch {
    return {
      lostReports: [],
      foundReports: [],
      notifications: [],
    };
  }
}

function loadAuthMemory() {
  try {
    return JSON.parse(localStorage.getItem("starterGalaxyAuth")) || {};
  } catch {
    return {};
  }
}

function saveAuthMemory() {
  localStorage.setItem("starterGalaxyAuth", JSON.stringify(authMemory));
}

function saveRadarMemory() {
  localStorage.setItem("starterGalaxyRadar", JSON.stringify(radarMemory));
}

function sanitizeRadarMemory() {
  radarMemory.notifications = radarMemory.notifications.filter((note) => {
    if (!note.ownerDomain || !note.lostDescription) return true;
    return radarMemory.lostReports.some(
      (report) =>
        report.domain === note.ownerDomain &&
        normalize(report.description || "") === normalize(note.lostDescription || "")
    );
  });
  saveRadarMemory();
}

function loadMarketState() {
  try {
    const parsed = JSON.parse(localStorage.getItem("starterGalaxyMarket")) || {};
    return {
      marketItems: Array.isArray(parsed.marketItems)
        ? parsed.marketItems
        : JSON.parse(JSON.stringify(defaultMarketItems)),
      pendingItems: Array.isArray(parsed.pendingItems) ? parsed.pendingItems : [],
    };
  } catch {
    return {
      marketItems: JSON.parse(JSON.stringify(defaultMarketItems)),
      pendingItems: [],
    };
  }
}

function saveMarketState() {
  localStorage.setItem(
    "starterGalaxyMarket",
    JSON.stringify({
      marketItems,
      pendingItems,
    })
  );
}

function normalizeMarketItem(item) {
  const imageMap = {
    "assets/demo san pham 1.jpg": "assets/demo-product-1.jpg",
    "assets/demo san pham 2.jpg": "assets/demo-product-2.jpg",
    "assets/demo san pham 3.jpg": "assets/demo-product-3.jpg",
  };

  return {
    ...item,
    image: imageMap[item.image] || item.image,
    careCount: Number(item.careCount) || 0,
    caredBy: Array.isArray(item.caredBy) ? item.caredBy : [],
    editCount: Number(item.editCount) || 0,
    edited: Boolean(item.edited),
    hidden: Boolean(item.hidden),
  };
}

function isAdmin() {
  return userMemory.domain === "artemis_8920";
}

function sortMarketItems() {
  marketItems.sort((a, b) => {
    const aPassed = a.stockStatus === "Đã pass";
    const bPassed = b.stockStatus === "Đã pass";
    return Number(aPassed) - Number(bPassed);
  });
}

function scoreMarketItem(item, query) {
  const tokens = tokenize(query);
  if (!tokens.length) return 0;
  const haystack = normalize(
    `${item.name || ""} ${item.description || ""} ${item.link || ""} ${item.contact || ""}`
  );
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function tokenize(value) {
  const stopwords = new Set([
    "minh",
    "mình",
    "bi",
    "bị",
    "mat",
    "mất",
    "nhat",
    "nhặt",
    "duoc",
    "được",
    "do",
    "đồ",
    "mon",
    "món",
    "cai",
    "cái",
    "co",
    "có",
    "o",
    "ở",
    "tai",
    "tại",
    "vao",
    "vào",
    "ngay",
    "ngày",
  ]);

  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !stopwords.has(token));
}

function scoreDescription(source, target) {
  const sourceTokens = new Set(tokenize(source));
  const targetTokens = new Set(tokenize(target));
  let score = 0;
  sourceTokens.forEach((token) => {
    if (targetTokens.has(token)) score += 1;
  });
  return score;
}

function normalizeDateText(value = "") {
  return normalize(value).replace(/[^0-9]/g, "");
}

function scoreReportMatch(report, description, date, image = "") {
  const score = scoreDescription(report.description || "", description || "");
  const reportTokenCount = new Set(tokenize(report.description || "")).size;
  const queryTokenCount = new Set(tokenize(description || "")).size;
  const neededStrongScore = Math.min(2, Math.max(1, Math.min(reportTokenCount, queryTokenCount)));
  const dateMatch = Boolean(date && report.date && normalizeDateText(report.date) === normalizeDateText(date));
  const imageSignal = Boolean(image && report.image);
  const level =
    score >= neededStrongScore && dateMatch
      ? "strong"
      : score >= 2 || (score >= 1 && dateMatch) || (imageSignal && score >= 1)
        ? "near"
        : "none";
  return {
    ...report,
    score,
    dateMatch,
    imageSignal,
    matchLevel: level,
  };
}

function getSortedReportMatches(reports, description, date, image = "", excludeDomain = "", domainKey = "domain") {
  return reports
    .filter((report) => !excludeDomain || report[domainKey] !== excludeDomain)
    .map((report) => scoreReportMatch(report, description, date, image))
    .filter((report) => report.matchLevel !== "none")
    .sort((a, b) => {
      if (a.matchLevel !== b.matchLevel) return a.matchLevel === "strong" ? -1 : 1;
      if (a.dateMatch !== b.dateMatch) return a.dateMatch ? -1 : 1;
      if (a.imageSignal !== b.imageSignal) return a.imageSignal ? -1 : 1;
      return b.score - a.score;
    });
}

function withAlternatives(matches) {
  const best = matches[0];
  if (!best) return null;
  const alternatives = matches.filter(
    (item) =>
      item !== best &&
      item.matchLevel === best.matchLevel &&
      item.dateMatch === best.dateMatch &&
      item.score === best.score
  );
  return { ...best, alternatives: alternatives.slice(0, 3) };
}

function findReportMatch(description, date, image = "", excludeDomain = "") {
  return withAlternatives(getSortedReportMatches(radarMemory.lostReports, description, date, image, excludeDomain, "domain"));
}

function findFoundReportMatch(description, date, image = "", excludeDomain = "") {
  return withAlternatives(getSortedReportMatches(radarMemory.foundReports, description, date, image, excludeDomain, "contact"));
}

function formatMoonText(text) {
  return text.replace(/\.\n/g, ".\n\n");
}

function playTypingTick(index) {
  if (index % 4 !== 0) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 620 + Math.random() * 180;
    gain.gain.value = 0.014;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.045);
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch {
    // Browser may block audio before the first user gesture.
  }
}

function setMoonText(text) {
  const displayText = formatMoonText(text);
  clearTimeout(typingTimer);
  moonText.textContent = "";
  moonText.classList.add("typing");

  let index = 0;
  const writeNext = () => {
    moonText.textContent = displayText.slice(0, index);
    playTypingTick(index);
    index += 1;

    if (index <= displayText.length) {
      typingTimer = window.setTimeout(writeNext, 18);
      return;
    }

    moonText.classList.remove("typing");
  };

  writeNext();
}

function clearChoices() {
  choiceRail.innerHTML = "";
}

function showChatBar(visible) {
  chatForm.hidden = !visible;
}

function addChoices(choices) {
  clearChoices();
  choices.forEach((choice) => {
    const button = document.createElement("button");
    const normalizedChoice = normalize(choice.value);
    button.className = `choice ${normalizedChoice.includes("tim") ? "choice-find" : ""} ${
      normalizedChoice.includes("tra") ? "choice-return" : ""
    }`;
    button.type = "button";
    button.textContent = choice.label;
    button.addEventListener("click", () => handleInput(choice.value));
    choiceRail.append(button);
  });
}

function addAction(label, onClick) {
  clearChoices();
  const button = document.createElement("button");
  button.className = "choice";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  choiceRail.append(button);
}

function addMailAction(domain, label = "Trả lại đồ cho người tìm") {
  clearChoices();
  const link = document.createElement("a");
  link.className = "choice mail-choice";
  link.href = `mailto:${domain}@vng.com.vn`;
  link.textContent = label;
  choiceRail.append(link);
}

function getArtemisLiveMinutes() {
  const start = new Date(2026, 5, 16, 0, 0, 0);
  const diff = Date.now() - start.getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function countUniqueDomains(items, key) {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size;
}

function getResolvedStarterCount() {
  const resolved = new Set();
  radarMemory.notifications.forEach((note) => {
    if (!note.ownerDomain || !note.lostDescription) return;
    resolved.add(note.ownerDomain);
  });
  return resolved.size;
}

function renderSignalStats() {
  const lostStarterCount = countUniqueDomains(radarMemory.lostReports, "domain");
  const foundStarterCount = countUniqueDomains(radarMemory.foundReports, "contact");
  signalStats.innerHTML = `
    <span>Trong <strong>${getArtemisLiveMinutes()}</strong> phút qua, Artemis đã tiếp nhận tín hiệu từ <strong>${lostStarterCount}</strong> Starter tìm đồ & <strong>${foundStarterCount}</strong> Starter trả đồ,<br /> giúp <strong>${getResolvedStarterCount()}</strong> Starter tìm được đồ</span>
  `;
  signalStats.classList.remove("pulse");
  requestAnimationFrame(() => signalStats.classList.add("pulse"));
}

function askStart() {
  state.mode = "choose";
  state.flow = null;
  state.data = {};
  showChatBar(false);
  setMoonText(`Hey ${userMemory.domain}, mình là radar của vũ trụ đồ đạc.\nBạn muốn tìm đồ thất lạc hay trả lại đồ bị mất?`);
  addChoices([
    { label: "Tìm đồ thất lạc", value: "tìm đồ thất lạc" },
    { label: "Trả lại đồ bị mất", value: "trả lại đồ bị mất" },
  ]);
}

function startLostFlow() {
  state.mode = "lost_description";
  state.flow = "lost";
  state.data = { domain: userMemory.domain };
  showChatBar(true);
  setMoonText("Bạn mô tả món đồ bị mất giúp mình nhé.\nCó ảnh thì gắn thêm ở nút Ảnh để radar dò chính xác hơn.");
  clearChoices();
}

function startReturnFlow() {
  state.mode = "return_description";
  state.flow = "return";
  state.data = { contact: userMemory.domain };
  showChatBar(true);
  setMoonText("Bạn mô tả món đồ nhặt được giúp mình nhé.\nCó ảnh thì gắn thêm ở nút Ảnh để radar dò chính xác hơn.");
  clearChoices();
}

function findStaticMatch(description) {
  const query = normalize(description);
  const tokens = new Set(query.split(/[^a-z0-9]+/).filter(Boolean));
  return lostSignals
    .map((signal) => {
      const score = signal.keywords.reduce((total, keyword) => {
        const normalizedKeyword = normalize(keyword);
        const matched = tokens.has(normalizedKeyword) || (normalizedKeyword.length >= 4 && query.includes(normalizedKeyword));
        return total + (matched ? 1 : 0);
      }, 0);
      return { ...signal, score };
    })
    .filter((signal) => signal.score >= 2)
    .sort((a, b) => b.score - a.score)[0];
}

function handleLostFlow(text) {
  if (state.mode === "lost_description") {
    state.data.description = text;
    state.mode = "lost_date";
    setMoonText("Bạn mất món này vào thời gian nào?\nNhập ngày/tháng/năm, ví dụ 16/06/2026.");
    return;
  }

  if (state.mode === "lost_date") {
    state.data.date = text;
    const lostReport = { ...state.data, type: "lost", createdAt: new Date().toISOString() };
    userMemory.searches.push(lostReport);
    radarMemory.lostReports.push(lostReport);
    saveRadarMemory();
    renderSignalStats();
    showChatBar(false);

    const foundMatch = findFoundReportMatch(state.data.description, state.data.date, state.data.image, userMemory.domain);
    if (foundMatch) {
      addMatchNotification(lostReport, foundMatch);
      const matchIntro =
        foundMatch.matchLevel === "strong"
          ? "Radar đã tìm được tín hiệu khớp với món bạn mất."
          : "Radar thấy có vẻ như đã tìm được tín hiệu gần giống món bạn mất.";
      const altText = foundMatch.alternatives?.length ? `\nCó thêm ${foundMatch.alternatives.length} tín hiệu gần giống, bạn kiểm tra trong ô noti nhé.` : "";
      setMoonText(`${matchIntro}\nContact người trả: ${foundMatch.contact}. Bạn liên hệ thử để xác nhận nhé.\nVị trí nhặt được: ${foundMatch.location || "đang chờ xác nhận"}.${altText}`);
      addMailAction(foundMatch.contact, "Gửi mail cho người trả đồ");
      state.mode = "choose";
      return;
    }

    setMoonText("Mình đã lục radar nhưng chưa thấy tín hiệu trùng khớp.\nMình sẽ nhắc bạn khi có món đồ bạn tìm nhé.");
    addAction("Bật thông báo", () => enableNotification(state.data));
    state.mode = "choose";
  }
}

function handleReturnFlow(text) {
  if (state.mode === "return_description") {
    state.data.description = text;
    state.mode = "return_date";
    setMoonText("Bạn nhặt được món này vào ngày nào?\nNhập ngày/tháng/năm, ví dụ 16/06/2026.");
    return;
  }

  if (state.mode === "return_date") {
    state.data.date = text;
    state.mode = "return_location";
    setMoonText("Mình đang quét vật thể này.\nBạn nhặt được ở vị trí nào?");
    return;
  }

  if (state.mode === "return_location") {
    state.data.location = text;
    const foundReport = { ...state.data, type: "found", createdAt: new Date().toISOString() };
    radarMemory.foundReports.push(foundReport);
    saveRadarMemory();
    renderSignalStats();

    const match = findReportMatch(state.data.description, state.data.date, state.data.image, userMemory.domain);

    if (match) {
      addMatchNotification(match, foundReport);
      const matchIntro =
        match.matchLevel === "strong"
          ? "Radar đã tìm được chủ nhân."
          : "Radar thấy có vẻ như đã tìm được chủ nhân.";
      const altText = match.alternatives?.length ? `\nCó thêm ${match.alternatives.length} Starter gần giống, bạn kiểm tra trong ô noti nhé.` : "";
      setMoonText(`${matchIntro}\nContact người tìm: ${match.domain}. Bạn liên hệ thử để xác nhận nhé.${altText}`);
      addMailAction(match.domain);
    } else {
      setMoonText("Cảm ơn bạn đã phát tín hiệu đến vũ trụ đồ đạc.\nKhi có Starter tìm món này, tụi mình sẽ kết nối hai bạn.");
      addChoices([
        { label: "Tìm đồ thất lạc", value: "tìm đồ thất lạc" },
        { label: "Trả lại đồ bị mất", value: "trả lại đồ bị mất" },
      ]);
    }
    showChatBar(false);
    state.mode = "choose";
  }
}

function handleInput(rawText) {
  if (!userMemory.domain) {
    showChatBar(false);
    setMoonText("Bạn cần nhập domain để vào vũ trụ trước nhé.");
    return;
  }

  const text = rawText.trim();
  if (!text) return;

  const normalized = normalize(text);
  chatInput.value = "";

  if (state.mode === "choose" || state.mode === "start") {
    if (normalized.includes("tim") || normalized.includes("tìm") || normalized.includes("lost")) {
      startLostFlow();
      return;
    }

    if (normalized.includes("tra") || normalized.includes("trả") || normalized.includes("return") || normalized.includes("nhat")) {
      startReturnFlow();
      return;
    }

    setMoonText("Mình chưa rõ tín hiệu này.\nBạn chọn một trong hai hướng nhé.");
    addChoices([
      { label: "Tìm đồ thất lạc", value: "tìm đồ thất lạc" },
      { label: "Trả lại đồ bị mất", value: "trả lại đồ bị mất" },
    ]);
    return;
  }

  if (state.flow === "lost") {
    handleLostFlow(text);
    return;
  }

  if (state.flow === "return") {
    handleReturnFlow(text);
  }
}

function renderMarket() {
  sortMarketItems();
  marketGrid.innerHTML = "";
  const query = marketSearchQuery.trim();
  const entries = marketItems.map((rawItem, index) => {
    const item = normalizeMarketItem(rawItem);
    marketItems[index] = item;
    return { item, index, relevance: scoreMarketItem(item, query) };
  });

  if (query) {
    entries.sort((a, b) => b.relevance - a.relevance);
    const matchCount = entries.filter((entry) => entry.relevance > 0 && !entry.item.hidden).length;
    marketSearchStatus.textContent = matchCount
      ? `Radar tìm thấy ${matchCount} món phù hợp và đã đẩy lên đầu phiên chợ.`
      : "Radar chưa thấy món nào khớp, bạn thử từ khóa khác nha.";
  } else {
    marketSearchStatus.textContent = "";
  }

  entries.forEach(({ item, index, relevance }) => {
    if (item.hidden && !isAdmin()) return;
    const cared = item.caredBy.includes(userMemory.domain);
    const passed = item.stockStatus === "Đã pass";
    const isOwner = item.contact === userMemory.domain;
    const canEdit = isOwner && !passed && item.editCount < 1;
    const isPremiumCloud = parsePriceValue(item.price) > 50000;
    const card = document.createElement("article");
    card.className = `market-card ${passed ? "passed" : ""} ${isPremiumCloud ? "premium-cloud" : ""} ${
      query && relevance > 0 ? "market-match" : ""
    }`;
    card.dataset.index = index;
    card.innerHTML = `
      <div class="product-image">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" />` : "ảnh sản phẩm<br />nằm đây"}
      </div>
      <div class="cloud-body">
        <div class="cloud-main">
          <h3>${item.name}${item.edited ? ` <span class="edited-label">(edited)</span>` : ""}</h3>
          <strong>${item.price}</strong>
        </div>
        <span class="contact-line">Contact: ${item.contact}</span>
      </div>
      <div class="stock-row">
        <span class="stock-pill ${passed || item.stockStatus === "Hết hàng" ? "sold-out" : "available"}">${item.stockStatus || "Còn hàng"}</span>
        <button class="detail-button" type="button">Chi tiết</button>
        <button class="care-button ${cared ? "cared" : ""}" type="button" aria-label="Thả sao quan tâm" ${passed ? "disabled" : ""}>
          <img src="assets/care-star.png" alt="" />
          <span>${item.careCount}</span>
        </button>
        ${
          isOwner
            ? `<button class="pass-button ${passed ? "reopen" : ""}" type="button">${passed ? "Mở lại" : "Đã pass"}</button>`
            : ""
        }
        ${
          canEdit
            ? `<button class="edit-button" type="button">Sửa</button>`
            : ""
        }
      </div>
    `;
    marketGrid.append(card);
  });
}

function renderAdmin() {
  adminList.innerHTML = "";
  const lostStarterCount = countUniqueDomains(radarMemory.lostReports, "domain");
  const foundStarterCount = countUniqueDomains(radarMemory.foundReports, "contact");
  const overview = document.createElement("section");
  overview.className = "admin-overview";
  overview.innerHTML = `
    <article><strong>${lostStarterCount}</strong><span>Starter tìm đồ</span></article>
    <article><strong>${foundStarterCount}</strong><span>Starter trả đồ</span></article>
    <article><strong>${pendingItems.length}</strong><span>vật phẩm chờ duyệt</span></article>
    <article><strong>${marketItems.length}</strong><span>vật phẩm trên chợ</span></article>
  `;
  adminList.append(overview);

  const lostSection = document.createElement("section");
  lostSection.className = "admin-section";
  lostSection.innerHTML = `
    <h4>Ai đang tìm đồ</h4>
    <div class="admin-table">
      <div class="admin-row admin-head">
        <span>Domain</span>
        <span>Món đồ</span>
        <span>Thời gian mất</span>
      </div>
    </div>
  `;
  const lostTable = lostSection.querySelector(".admin-table");
  if (!radarMemory.lostReports.length) {
    lostTable.innerHTML += `<p class="empty-note">Chưa có tín hiệu tìm đồ.</p>`;
  } else {
    radarMemory.lostReports.slice(0, 8).forEach((item) => {
      lostTable.innerHTML += `
        <div class="admin-row">
          <span><strong>${item.domain}</strong></span>
          <span>${item.description}</span>
          <span>${item.date || "chưa rõ ngày"}</span>
        </div>
      `;
    });
  }
  adminList.append(lostSection);

  const foundSection = document.createElement("section");
  foundSection.className = "admin-section";
  foundSection.innerHTML = `
    <h4>Ai đang trả đồ</h4>
    <div class="admin-table found-admin-table">
      <div class="admin-row admin-head">
        <span>Domain</span>
        <span>Món đồ</span>
        <span>Thời gian nhặt</span>
        <span>Vị trí nhặt</span>
      </div>
    </div>
  `;
  const foundTable = foundSection.querySelector(".admin-table");
  if (!radarMemory.foundReports.length) {
    foundTable.innerHTML += `<p class="empty-note">Chưa có tín hiệu trả đồ.</p>`;
  } else {
    radarMemory.foundReports.slice(0, 8).forEach((item) => {
      foundTable.innerHTML += `
        <div class="admin-row">
          <span><strong>${item.contact}</strong></span>
          <span>${item.description}</span>
          <span>${item.date || "chưa rõ ngày"}</span>
          <span>${item.location || "chưa rõ vị trí"}</span>
        </div>
      `;
    });
  }
  adminList.append(foundSection);

  const approvedSection = document.createElement("section");
  approvedSection.className = "admin-section";
  approvedSection.innerHTML = `
    <h4>Vật phẩm đã lên chợ</h4>
    <div class="admin-table market-admin-table">
      <div class="admin-row admin-head">
        <span>Người đăng</span>
        <span>Vật phẩm</span>
        <span>Giá / trạng thái</span>
        <span>Hành động</span>
      </div>
    </div>
  `;
  const approvedTable = approvedSection.querySelector(".admin-table");
  if (!marketItems.length) {
    approvedTable.innerHTML += `<p class="empty-note">Chưa có vật phẩm nào trên chợ.</p>`;
  }
  marketItems.forEach((item, index) => {
    approvedTable.innerHTML += `
      <div class="admin-row">
        <span><strong>${item.contact}</strong></span>
        <span>${item.name}${item.edited ? " (edited)" : ""}</span>
        <span>${item.price} / ${item.hidden ? "Đang ẩn" : item.stockStatus || "Còn hàng"}</span>
        <span class="admin-actions">
          <button type="button" class="admin-edit" data-admin-edit-market="${index}">Sửa</button>
          <button type="button" class="${item.hidden ? "admin-show" : "admin-danger"}" data-toggle-market="${index}">
            ${item.hidden ? "Hiện" : "Ẩn"}
          </button>
        </span>
      </div>
    `;
  });
  adminList.append(approvedSection);

  const pendingSection = document.createElement("section");
  pendingSection.className = "admin-section";
  pendingSection.innerHTML = `
    <h4>Vật phẩm chờ duyệt</h4>
    <div class="admin-table market-admin-table">
      <div class="admin-row admin-head">
        <span>Người đăng</span>
        <span>Vật phẩm</span>
        <span>Giá / SL</span>
        <span>Hành động</span>
      </div>
    </div>
  `;
  const pendingTable = pendingSection.querySelector(".admin-table");
  adminList.append(pendingSection);

  if (!pendingItems.length) {
    pendingTable.innerHTML += `<p class="empty-note">Chưa có vật phẩm nào chờ Artemis duyệt.</p>`;
    return;
  }

  pendingItems.forEach((item, index) => {
    pendingTable.innerHTML += `
      <div class="admin-row">
        <span><strong>${item.contact}</strong></span>
        <span>${item.name}</span>
        <span>${item.price} / ${item.quantity}</span>
        <span class="admin-actions"><button type="button" class="admin-approve" data-approve="${index}">Duyệt</button></span>
      </div>
    `;
  });
}

function renderNotifications() {
  const visibleNotifications = radarMemory.notifications.filter(
    (item) => item.recipientDomain === userMemory.domain || item.recipientDomain === "*"
  );
  const unreadNotifications = visibleNotifications.filter((item) => !(item.readBy || []).includes(userMemory.domain));

  notificationCount = unreadNotifications.length;
  notificationBadge.textContent = notificationCount;
  notificationList.innerHTML = "";

  const groups = [
    ["match", "Radar match đồ", "Chưa có tín hiệu match mới."],
    ["market", "Phiên chợ trên mây", "Chưa có tín hiệu quan tâm vật phẩm."],
    ["radar", "Tín hiệu radar", "Chưa có radar nào đang chờ."],
  ];

  groups.forEach(([type, label, emptyText]) => {
    const items = visibleNotifications.filter((item) => (item.type || "radar") === type);
    const section = document.createElement("section");
    section.className = "notification-group";
    section.innerHTML = `<h4>${label}</h4>`;
    if (!items.length) {
      section.innerHTML += `<p class="empty-note group-empty">${emptyText}</p>`;
      notificationList.append(section);
      return;
    }
    items.forEach((item) => {
      const note = document.createElement("article");
      note.className = `signal-note ${(item.readBy || []).includes(userMemory.domain) ? "read" : "unread"}`;
      note.innerHTML = `
        <p>${item.message}</p>
        ${item.image ? `<img src="${item.image}" alt="Ảnh vật phẩm được ghi nhận" />` : ""}
      `;
      section.append(note);
    });
    notificationList.append(section);
  });
}

function markVisibleNotificationsRead() {
  let changed = false;
  radarMemory.notifications.forEach((item) => {
    if (item.recipientDomain !== userMemory.domain && item.recipientDomain !== "*") return;
    item.readBy = Array.isArray(item.readBy) ? item.readBy : [];
    if (!item.readBy.includes(userMemory.domain)) {
      item.readBy.push(userMemory.domain);
      changed = true;
    }
  });
  if (changed) saveRadarMemory();
  renderNotifications();
}

function enableNotification(data) {
  radarMemory.notifications.unshift({
    recipientDomain: data.domain,
    type: "radar",
    message: `Đã bật radar cho domain ${data.domain}. Khi có tín hiệu khớp với "${data.description}" (${data.date}), Artemis sẽ gửi thông báo về đây.`,
    createdAt: new Date().toISOString(),
  });
  saveRadarMemory();
  renderNotifications();
  setMoonText("Đã bật thông báo.\nKhi vũ trụ bắt được tín hiệu khớp, mình sẽ nhắc bạn ngay.");
  addChoices([
    { label: "Tìm đồ thất lạc", value: "tìm đồ thất lạc" },
    { label: "Trả lại đồ bị mất", value: "trả lại đồ bị mất" },
  ]);
  showChatBar(false);
}

function addMatchNotification(lostReport, foundReport) {
  const isStrong = lostReport.matchLevel === "strong" || foundReport.matchLevel === "strong";
  const ownerPrefix = isStrong ? "Radar vừa bắt được tín hiệu khớp" : "Radar thấy có tín hiệu gần giống";
  const finderPrefix = isStrong ? "Radar đã tìm được chủ nhân" : "Radar thấy có vẻ như đã tìm được chủ nhân";
  const foundAlternatives = (foundReport.alternatives || []).map((item) => item.contact).filter(Boolean);
  const lostAlternatives = (lostReport.alternatives || []).map((item) => item.domain).filter(Boolean);
  const foundAltText = foundAlternatives.length ? ` Có thêm tín hiệu gần giống từ: ${foundAlternatives.join(", ")}.` : "";
  const lostAltText = lostAlternatives.length ? ` Có thêm Starter gần giống: ${lostAlternatives.join(", ")}.` : "";
  radarMemory.notifications.unshift({
    recipientDomain: lostReport.domain,
    type: "match",
    message: `${ownerPrefix} với món bạn tìm: "${foundReport.description}". Contact người trả: ${foundReport.contact}. Bạn liên hệ thử để xác nhận nhé.${foundAltText} Thời gian nhặt: ${foundReport.date}. Vị trí: ${foundReport.location}.`,
    ownerDomain: lostReport.domain,
    finderDomain: foundReport.contact,
    lostDescription: lostReport.description,
    foundDescription: foundReport.description,
    foundDate: foundReport.date,
    location: foundReport.location,
    image: foundReport.image || lostReport.image || "",
    createdAt: new Date().toISOString(),
  });
  radarMemory.notifications.unshift({
    recipientDomain: foundReport.contact,
    type: "match",
    message: `${finderPrefix} cho "${foundReport.description}". Contact người tìm: ${lostReport.domain}. Bạn liên hệ thử để xác nhận nhé.${lostAltText}`,
    ownerDomain: lostReport.domain,
    finderDomain: foundReport.contact,
    lostDescription: lostReport.description,
    foundDescription: foundReport.description,
    image: foundReport.image || lostReport.image || "",
    foundDate: foundReport.date,
    location: foundReport.location,
    createdAt: new Date().toISOString(),
  });
  saveRadarMemory();
  renderNotifications();
}

function readImageAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.readAsDataURL(file);
  });
}

function setLaunchChatMode(enabled) {
  marketForm.classList.toggle("chat-mode", enabled);
  launchWizard.hidden = !enabled;
  launchSubmit.hidden = enabled;
  marketForm.querySelectorAll("[data-market-field]").forEach((field) => {
    field.hidden = enabled;
  });
}

function addLaunchBubble(text, type = "agent") {
  const bubble = document.createElement("p");
  bubble.className = `launch-bubble ${type}`;
  bubble.textContent = text;
  launchWizardMessages.append(bubble);
  launchWizardMessages.scrollTop = launchWizardMessages.scrollHeight;
}

function showLaunchWizardStep() {
  const step = launchWizardSteps[launchWizardStep];
  if (!step) return;
  addLaunchBubble(step.question, "agent");
  launchWizardInput.value = "";
  launchWizardInput.placeholder = step.placeholder;
  launchWizardInput.hidden = step.key === "image";
  launchWizardNext.textContent = step.key === "image" ? "Hoàn tất" : "Gửi";
  marketForm.querySelector('[data-market-field="image"]').hidden = step.key !== "image";
  if (step.key === "image") {
    marketImage.focus();
  } else {
    launchWizardInput.focus();
  }
}

function startLaunchWizard() {
  launchWizardStep = 0;
  launchWizardData = {};
  launchWizardMessages.innerHTML = "";
  setLaunchChatMode(true);
  marketForm.querySelector('[data-market-field="image"]').hidden = true;
  showLaunchWizardStep();
}

function applyLaunchWizardData() {
  marketName.value = launchWizardData.name || "";
  marketQuantity.value = launchWizardData.quantity || "1";
  marketDescription.value = launchWizardData.description || "";
  marketPrice.value = normalizePrice(launchWizardData.price || "");
  marketContact.value = launchWizardData.contact || userMemory.domain || "";
}

function handleLaunchWizardNext() {
  const step = launchWizardSteps[launchWizardStep];
  if (!step) return;

  if (step.key === "image") {
    if (!marketImage.files[0]) {
      launchStatus.textContent = "Bạn thêm ảnh vật phẩm giúp mình nha.";
      return;
    }
    addLaunchBubble("Đã nhận ảnh vật phẩm.", "user");
    applyLaunchWizardData();
    launchStatus.textContent = "";
    marketForm.requestSubmit();
    return;
  }

  const value = launchWizardInput.value.trim();
  if (!value) {
    launchStatus.textContent = "Bạn trả lời câu này giúp Artemis nha.";
    launchWizardInput.focus();
    return;
  }
  launchStatus.textContent = "";
  launchWizardData[step.key] = value;
  addLaunchBubble(value, "user");
  launchWizardStep += 1;
  showLaunchWizardStep();
}

function openLaunchFormForCreate() {
  editingMarketIndex = null;
  marketForm.reset();
  marketImage.required = true;
  marketContact.disabled = false;
  launchTitle.textContent = "Phóng vật phẩm lên chợ";
  launchSubmit.textContent = "Submit";
  launchPanel.hidden = false;
  launchStatus.textContent = "";
  if (userMemory.domain) marketContact.value = userMemory.domain;
  startLaunchWizard();
}

function openLaunchFormForEdit(index) {
  const item = normalizeMarketItem(marketItems[index]);
  const adminEditing = isAdmin();
  if (!item || (!adminEditing && (item.contact !== userMemory.domain || item.editCount >= 1 || item.stockStatus === "Đã pass"))) return;

  editingMarketIndex = index;
  marketName.value = item.name || "";
  marketQuantity.value = item.quantity || "1";
  marketDescription.value = item.description || "";
  marketPrice.value = item.price || "";
  marketStockStatus.value = item.stockStatus || "Còn hàng";
  marketContact.value = item.contact || userMemory.domain;
  marketContact.disabled = !adminEditing;
  marketImage.value = "";
  marketImage.required = false;
  setLaunchChatMode(false);
  launchTitle.textContent = adminEditing ? "Artemis sửa vật phẩm" : "Sửa vật phẩm đã đăng";
  launchSubmit.textContent = "Lưu chỉnh sửa";
  launchStatus.textContent = adminEditing ? "Artemis có thể chỉnh sửa thông tin vật phẩm khi cần." : "Bạn chỉ được chỉnh sửa món này 1 lần.";
  launchPanel.hidden = false;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const domain = loginDomain.value.trim().toLowerCase();
  const password = loginPassword.value.trim();
  loginStatus.textContent = "";

  if (!domain || !password) {
    loginStatus.textContent = "Bạn nhập domain và mật khẩu giúp mình nhé.";
    return;
  }

  if (authMemory[domain] && authMemory[domain] !== password) {
    loginStatus.textContent = "Mật khẩu chưa đúng với domain này.";
    return;
  }

  if (!authMemory[domain]) {
    authMemory[domain] = password;
    saveAuthMemory();
  }

  userMemory.domain = domain;
  openAdminPanel.hidden = userMemory.domain !== "artemis_8920";
  renderMarket();
  renderNotifications();
  loginPanel.hidden = true;
  askStart();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const image = await readImageAsDataUrl(chatImage.files[0]);
  if (image && (state.flow === "lost" || state.flow === "return")) {
    state.data.image = image;
  }
  chatImage.value = "";
  chatImage.closest(".chat-image-button")?.classList.remove("has-image");
  handleInput(chatInput.value);
});

chatImage.addEventListener("change", () => {
  chatImage.closest(".chat-image-button")?.classList.toggle("has-image", Boolean(chatImage.files[0]));
});

marketPrice.addEventListener("blur", () => {
  marketPrice.value = normalizePrice(marketPrice.value);
});

marketSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  marketSearchQuery = marketSearchInput.value.trim();
  renderMarket();
});

marketSearchInput.addEventListener("input", () => {
  if (marketSearchInput.value.trim()) return;
  marketSearchQuery = "";
  renderMarket();
});

document.querySelector("#openLaunchForm").addEventListener("click", () => {
  openLaunchFormForCreate();
});

launchWizardNext.addEventListener("click", handleLaunchWizardNext);

launchWizardInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  handleLaunchWizardNext();
});

document.querySelector("#closeLaunchForm").addEventListener("click", () => {
  editingMarketIndex = null;
  marketContact.disabled = false;
  setLaunchChatMode(false);
  launchPanel.hidden = true;
});

document.querySelector("#notificationButton").addEventListener("click", () => {
  notificationPanel.hidden = false;
  markVisibleNotificationsRead();
});

document.querySelector("#closeNotificationPanel").addEventListener("click", () => {
  notificationPanel.hidden = true;
});

openAdminPanel.addEventListener("click", () => {
  if (userMemory.domain !== "artemis_8920") return;
  renderAdmin();
  adminPanel.hidden = false;
});

document.querySelector("#closeAdminPanel").addEventListener("click", () => {
  adminPanel.hidden = true;
});

document.querySelector("#closeDetailPanel").addEventListener("click", () => {
  detailPanel.hidden = true;
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", () => {
  backToTop.hidden = window.scrollY < 620;
});

marketForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateMarketForm()) return;
  if (editingMarketIndex === null && !marketImage.files[0]) {
    launchStatus.textContent = "Bạn thêm ảnh vật phẩm giúp mình nha. Phiên chợ trên mây cần ảnh để mọi người dễ xem.";
    marketImage.focus();
    return;
  }
  const image = await readImageAsDataUrl(marketImage.files[0]);
  if (editingMarketIndex !== null) {
    const item = normalizeMarketItem(marketItems[editingMarketIndex]);
    const adminEditing = isAdmin();
    if (!item || (!adminEditing && (item.contact !== userMemory.domain || item.editCount >= 1))) return;

    marketItems[editingMarketIndex] = {
      ...item,
      name: marketName.value.trim(),
      quantity: marketQuantity.value,
      description: marketDescription.value.trim(),
      link: extractLink(marketDescription.value.trim()),
      price: normalizePrice(marketPrice.value),
      contact: adminEditing ? marketContact.value.trim() : item.contact,
      stockStatus: marketStockStatus.value || item.stockStatus || "Còn hàng",
      image: image || item.image,
      edited: true,
      editCount: adminEditing ? item.editCount : item.editCount + 1,
    };
    saveMarketState();
    renderMarket();
    renderAdmin();
    launchStatus.textContent = "Radar đã lưu chỉnh sửa. Món này sẽ hiển thị (edited).";
    editingMarketIndex = null;
    marketContact.disabled = false;
    marketForm.reset();
    launchPanel.hidden = true;
    return;
  }

  pendingItems.unshift({
    name: marketName.value.trim(),
    quantity: marketQuantity.value,
    description: marketDescription.value.trim(),
    link: extractLink(marketDescription.value.trim()),
    price: normalizePrice(marketPrice.value),
    contact: marketContact.value.trim(),
    stockStatus: "Còn hàng",
    image,
    status: "Chờ Artemis duyệt",
    careCount: 0,
    caredBy: [],
    editCount: 0,
    edited: false,
    hidden: false,
  });
  saveMarketState();
  renderAdmin();
  launchStatus.textContent = "Món đồ của bạn sẽ xuất hiện khi được Artemis duyệt.";
  marketForm.reset();
  setLaunchChatMode(false);
  launchPanel.hidden = true;
  setMoonText("Artemis đã nhận đủ tín hiệu món đồ.\nMón của bạn sẽ xuất hiện khi được duyệt nha.");
});

adminList.addEventListener("click", (event) => {
  const adminEditButton = event.target.closest("[data-admin-edit-market]");
  if (adminEditButton) {
    if (!isAdmin()) return;
    openLaunchFormForEdit(Number(adminEditButton.dataset.adminEditMarket));
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-market]");
  if (toggleButton) {
    if (!isAdmin()) return;
    const index = Number(toggleButton.dataset.toggleMarket);
    const item = normalizeMarketItem(marketItems[index]);
    if (!item) return;
    item.hidden = !item.hidden;
    marketItems[index] = item;
    saveMarketState();
    renderMarket();
    renderAdmin();
    setMoonText(
      item.hidden
        ? `Artemis đã ẩn "${item.name}" khỏi Phiên chợ trên mây.`
        : `Artemis đã hiện lại "${item.name}" trên Phiên chợ trên mây.`
    );
    return;
  }

  const button = event.target.closest("[data-approve]");
  if (!button) return;
  const index = Number(button.dataset.approve);
  const item = pendingItems.splice(index, 1)[0];
  if (!item) return;
  marketItems.unshift({ ...item, status: "Đã duyệt", hidden: false });
  saveMarketState();
  renderMarket();
  renderAdmin();
  setMoonText(`Artemis đã duyệt "${item.name}".\nVật phẩm đã bay lên Phiên chợ trên mây.`);
});

marketGrid.addEventListener("click", (event) => {
  const detailButton = event.target.closest(".detail-button");
  if (detailButton) {
    const card = detailButton.closest(".market-card");
    const item = marketItems[Number(card.dataset.index)];
    openDetail(item);
    return;
  }

  const editButton = event.target.closest(".edit-button");
  if (editButton) {
    const card = editButton.closest(".market-card");
    openLaunchFormForEdit(Number(card.dataset.index));
    return;
  }

  const passButton = event.target.closest(".pass-button");
  if (passButton) {
    const card = passButton.closest(".market-card");
    const index = Number(card.dataset.index);
    const item = normalizeMarketItem(marketItems[index]);
    if (!item || item.contact !== userMemory.domain) return;
    const willReopen = item.stockStatus === "Đã pass";
    item.stockStatus = willReopen ? "Còn hàng" : "Đã pass";
    marketItems[index] = item;
    sortMarketItems();
    saveMarketState();
    renderMarket();
    renderAdmin();
    showChatBar(false);
    setMoonText(
      willReopen
        ? `Radar đã mở lại "${item.name}".\nMón này đã quay lại Phiên chợ trên mây.`
        : `Radar đã chuyển "${item.name}" sang trạng thái đã pass.\nMón này sẽ bay xuống cuối Phiên chợ trên mây.`
    );
    return;
  }

  const button = event.target.closest(".care-button");
  if (!button) return;
  const card = button.closest(".market-card");
  const item = normalizeMarketItem(marketItems[Number(card.dataset.index)]);
  marketItems[Number(card.dataset.index)] = item;

  const caredIndex = item.caredBy.indexOf(userMemory.domain);
  const willUncare = caredIndex >= 0;

  if (willUncare) {
    item.caredBy.splice(caredIndex, 1);
    item.careCount = Math.max(0, item.careCount - 1);
    userMemory.interests = userMemory.interests.filter((name) => name !== item.name);
  } else {
    item.caredBy.push(userMemory.domain);
    item.careCount += 1;
    userMemory.interests.push(item.name);
  }
  saveMarketState();

  if (!willUncare && item.contact && item.contact !== userMemory.domain) {
    radarMemory.notifications.unshift({
      recipientDomain: item.contact,
      type: "market",
      message: `${userMemory.domain} vừa thả sao quan tâm món "${item.name}" của bạn trong Phiên chợ trên mây.`,
      itemName: item.name,
      interestedDomain: userMemory.domain,
      createdAt: new Date().toISOString(),
    });
    saveRadarMemory();
  }

  renderMarket();
  renderNotifications();
  showChatBar(false);
  setMoonText(
    willUncare
      ? "Radar đã bỏ sao quan tâm của bạn khỏi món này."
      : "Radar đã ghi nhận sao quan tâm của bạn.\nChủ món đồ sẽ nhận được tín hiệu từ bạn."
  );
});

function extractLink(text) {
  return text.match(/https?:\/\/\S+/)?.[0] || "";
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizePrice(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /đ$/i.test(trimmed) ? trimmed : `${trimmed}đ`;
}

function parsePriceValue(value = "") {
  const digits = String(value).replace(/[^\d]/g, "");
  return Number(digits) || 0;
}

function validateMarketForm() {
  if (countWords(marketName.value) >= 6) {
    launchStatus.textContent = "Tên vật phẩm chỉ nên dưới 6 từ thôi nha.";
    marketName.focus();
    return false;
  }

  if (countWords(marketDescription.value) >= 100) {
    launchStatus.textContent = "Mô tả sản phẩm chỉ nên dưới 100 từ thôi nha.";
    marketDescription.focus();
    return false;
  }

  marketPrice.value = normalizePrice(marketPrice.value);
  return true;
}

function openDetail(item) {
  if (!item) return;
  detailTitle.textContent = item.name;
  detailContent.innerHTML = `
    ${
      item.image
        ? `<div class="detail-image"><img src="${item.image}" alt="${item.name}" /></div>`
        : `<div class="detail-image"></div>`
    }
    <p><strong>Số lượng:</strong> ${item.quantity || "1"}</p>
    <p><strong>Giá hữu nghị:</strong> ${item.price || "Chưa có giá."}</p>
    <p><strong>Mô tả:</strong> ${item.description || "Chưa có mô tả."}</p>
    ${
      item.link
        ? `<p><strong>Link:</strong> <a href="${item.link}" target="_blank" rel="noreferrer">${item.link}</a></p>`
        : `<p><strong>Link:</strong> Chưa có link đính kèm.</p>`
    }
    <p><strong>Contact:</strong> ${item.contact}</p>
    <p><strong>Gợi ý:</strong> Starter ping MS Teams để trao đổi nếu có nhu cầu mua nhé.</p>
  `;
  detailPanel.hidden = false;
}

renderMarket();
renderAdmin();
renderNotifications();
renderSignalStats();
setInterval(renderSignalStats, 60000);
showChatBar(false);
setMoonText("Nhập domain để Artemis mở cổng vào vũ trụ đồ đạc nhé.");

