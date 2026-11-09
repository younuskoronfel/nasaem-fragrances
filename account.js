const account = document.querySelector("#account");
const accountToggle = document.querySelector(".account-toggle");
const unavailable = account.querySelector(".account-unavailable");
const emailForm = account.querySelector(".account-email-form");
const codeForm = account.querySelector(".account-code-form");
const profile = account.querySelector(".account-profile");
const accountStatus = account.querySelector(".account-status");
const news = account.querySelector(".account-updates input");
const watches = account.querySelector(".account-watches");
const stock = new Map();
const accountConfigured = nasaemAccountConfig.url.startsWith("https://") && nasaemAccountConfig.publishableKey.startsWith("sb_publishable_");
let accountReady;
let accountClient;
let accountUser;
let requestedEmail;
let restockRequest;
let accountOpener;
let accountFeedback;

function accountMessage(key, values) {
  accountFeedback = key ? [key, values] : undefined;
  accountStatus.textContent = key ? t(key, values) : "";
}

function isScentSoldOut(id) {
  return stock.get(id) === "sold_out";
}

function prepareAccount() {
  if (!accountConfigured) return Promise.resolve();
  accountReady ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0";
    script.crossOrigin = "anonymous";
    script.integrity = "sha384-1qxdq7qui0E5OGQx7KlSCCpPydLIt8lgUjqM3jGxWLXq9AIGC661VIvU/NPT6BQP";
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  }).then(async () => {
    accountClient = window.supabase.createClient(nasaemAccountConfig.url, nasaemAccountConfig.publishableKey);
    const [sessionResult, stockResult] = await Promise.all([
      accountClient.auth.getSession(),
      accountClient.from("inventory").select("scent_id,status")
    ]);
    accountUser = sessionResult.data.session?.user;
    for (const item of stockResult.data ?? []) stock.set(item.scent_id, item.status);
    document.dispatchEvent(new Event("nasaem:availability"));
    accountClient.auth.onAuthStateChange((_event, session) => {
      const previous = accountUser?.id;
      accountUser = session?.user;
      if (previous && !accountUser && account.open) showAccount();
    });
  }).catch(error => {
    accountReady = undefined;
    throw error;
  });
  return accountReady;
}

function showAccount() {
  unavailable.hidden = Boolean(accountClient);
  emailForm.hidden = !accountClient || Boolean(accountUser || requestedEmail);
  codeForm.hidden = !accountClient || Boolean(accountUser) || !requestedEmail;
  profile.hidden = !accountClient || !accountUser;
}

async function refreshAccount() {
  showAccount();
  if (!accountUser) return;
  const userId = accountUser.id;
  const [settings, alerts] = await Promise.all([
    accountClient.from("email_preferences").select("news").eq("user_id", userId).maybeSingle(),
    accountClient.from("restock_watches").select("scent_id").eq("user_id", userId)
  ]);
  if (accountUser?.id !== userId) return;
  if (settings.error || alerts.error) {
    accountMessage("We couldn’t update your account. Please try again.");
    return;
  }
  profile.querySelector(".account-address").textContent = accountUser.email;
  news.checked = Boolean(settings.data?.news);
  watches.replaceChildren(...alerts.data.map(({ scent_id }) => {
    const name = scents.find(scent => scent.id === scent_id)?.name ?? scent_id;
    const row = document.createElement("li");
    const label = document.createElement("bdi");
    const remove = document.createElement("button");
    label.textContent = name;
    remove.className = "text-link";
    remove.type = "button";
    remove.textContent = t("Remove");
    remove.setAttribute("aria-label", t("Remove {name}", { name }));
    remove.addEventListener("click", async () => {
      const { error } = await accountClient.from("restock_watches").delete().eq("user_id", userId).eq("scent_id", scent_id);
      if (!error) await refreshAccount();
      accountMessage(error ? "We couldn’t update your account. Please try again." : "Restock alert removed.");
      account.querySelector(".account-signout").focus();
    });
    row.append(label, remove);
    return row;
  }));
  profile.querySelector(".account-no-watches").hidden = Boolean(alerts.data.length);
}

async function saveRestockRequest() {
  if (!restockRequest || !accountUser) return;
  const scentId = restockRequest;
  const scent = scents.find(({ id }) => id === scentId);
  const { error } = await accountClient.from("restock_watches")
    .upsert({ user_id: accountUser.id, scent_id: scentId }, { ignoreDuplicates: true });
  if (error) {
    accountMessage("We couldn’t update your account. Please try again.");
    return;
  }
  restockRequest = undefined;
  accountMessage("We’ll email you when {name} is back.", { name: scent.name });
}

async function openAccount(opener = accountToggle, scentId) {
  accountOpener = opener;
  restockRequest = scentId;
  requestedEmail = undefined;
  accountMessage();
  account.showModal();
  try {
    await prepareAccount();
    if (!account.open) return;
    if (accountUser) await saveRestockRequest();
    else if (scentId) accountMessage("Sign in for a restock alert for {name}.", { name: scents.find(({ id }) => id === scentId).name });
    await refreshAccount();
  } catch {
    accountMessage("We couldn’t update your account. Please try again.");
  }
}

accountToggle.hidden = false;
accountToggle.addEventListener("click", () => openAccount());
account.querySelector(".close").addEventListener("click", () => account.close());
account.addEventListener("close", () => {
  codeForm.reset();
  (accountOpener?.isConnected ? accountOpener : accountToggle).focus({ preventScroll: true });
});

emailForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = emailForm.querySelector("button");
  const email = emailForm.elements.email.value.trim();
  button.disabled = true;
  try {
    const { error } = await accountClient.auth.signInWithOtp({ email });
    if (error) throw error;
    if (!account.open) return;
    requestedEmail = email;
    accountMessage();
    showAccount();
    codeForm.elements.code.focus();
  } catch {
    accountMessage("We couldn’t send a code. Please try again shortly.");
  } finally {
    button.disabled = false;
  }
});

codeForm.addEventListener("submit", async event => {
  event.preventDefault();
  const button = codeForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const { data, error } = await accountClient.auth.verifyOtp({
      email: requestedEmail, token: codeForm.elements.code.value.trim(), type: "email"
    });
    if (error) throw error;
    accountUser = data.user;
    requestedEmail = undefined;
    codeForm.reset();
    accountMessage();
    await saveRestockRequest();
    await refreshAccount();
    if (account.open) news.focus();
  } catch {
    accountMessage("This code couldn’t be verified. Check it or request a new one.");
  } finally {
    button.disabled = false;
  }
});

account.querySelector(".account-change-email").addEventListener("click", () => {
  requestedEmail = undefined;
  codeForm.reset();
  accountMessage();
  showAccount();
  emailForm.elements.email.focus();
});

news.addEventListener("change", async () => {
  if (!accountUser) return;
  const checked = news.checked;
  news.disabled = true;
  try {
    const { error } = await accountClient.from("email_preferences").upsert({ user_id: accountUser.id, news: checked });
    if (error) throw error;
    accountMessage("Email preferences saved.");
  } catch {
    news.checked = !checked;
    accountMessage("We couldn’t update your account. Please try again.");
  } finally {
    news.disabled = false;
  }
});

account.querySelector(".account-signout").addEventListener("click", async () => {
  const { error } = await accountClient.auth.signOut({ scope: "local" });
  if (error) return accountMessage("We couldn’t update your account. Please try again.");
  accountUser = undefined;
  requestedEmail = undefined;
  restockRequest = undefined;
  emailForm.reset();
  accountMessage();
  showAccount();
  emailForm.elements.email.focus();
});

document.addEventListener("nasaem:language", () => {
  if (accountFeedback) accountMessage(...accountFeedback);
  if (account.open && accountUser) refreshAccount().catch(() => {});
});
if (accountConfigured) prepareAccount().catch(() => {});
