const account = document.querySelector("#account");
const accountToggle = document.querySelector(".account-toggle");
const unavailable = account.querySelector(".account-unavailable");
const googleButton = account.querySelector(".account-google");
const emailForm = account.querySelector(".account-email-form");
const codeForm = account.querySelector(".account-code-form");
const profile = account.querySelector(".account-profile");
const profilePicker = account.querySelector(".account-profile-picker");
const profileForm = account.querySelector(".account-profile-form");
const profileAdd = account.querySelector(".account-profile-add");
const profileEdit = account.querySelector(".account-profile-edit");
const passwordForm = account.querySelector(".account-password-form");
const passwordInput = emailForm.elements.password;
const modeButtons = [...emailForm.querySelectorAll("[data-account-mode]")];
const codeSwitch = emailForm.querySelector(".account-switch-code");
const accountStatus = account.querySelector(".account-status");
const news = account.querySelector(".account-updates input");
const watches = account.querySelector(".account-watches");
const stock = new Map();
const accountConfigured = nasaemAccountConfig.url.startsWith("https://") && nasaemAccountConfig.publishableKey.startsWith("sb_publishable_");
const emailSignInAvailable = accountConfigured && nasaemAccountConfig.emailSignIn === true;
const googleSignInAvailable = accountConfigured && nasaemAccountConfig.googleSignIn === true;
const emailUpdatesAvailable = (emailSignInAvailable || googleSignInAvailable) && nasaemAccountConfig.emailUpdates === true;
let accountReady;
let accountClient;
let accountUser;
let requestedEmail;
let restockRequest;
let accountOpener;
let accountFeedback;
let accountMode = "signin";
let savedProfiles = [];
let activeProfile;
let editingProfile;

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
    accountClient = window.supabase.createClient(nasaemAccountConfig.url, nasaemAccountConfig.publishableKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true }
    });
    accountClient.auth.onAuthStateChange((_event, session) => {
      const previous = accountUser?.id;
      accountUser = session?.user;
      if (previous !== accountUser?.id && account.open) {
        // Supabase holds its auth lock during this callback.
        setTimeout(() => {
          if (account.open) refreshAccount().catch(() => {});
        }, 0);
      }
    });
    const { data } = await accountClient.auth.getSession();
    accountUser = data.session?.user;
  }).catch(error => {
    accountReady = undefined;
    throw error;
  });
  return accountReady;
}

function showAccount() {
  unavailable.hidden = Boolean(accountUser || (accountClient && (emailSignInAvailable || googleSignInAvailable)));
  googleButton.hidden = !googleSignInAvailable || !accountClient || Boolean(accountUser || requestedEmail);
  emailForm.hidden = !emailSignInAvailable || !accountClient || Boolean(accountUser || requestedEmail);
  codeForm.hidden = !emailSignInAvailable || !accountClient || Boolean(accountUser) || !requestedEmail;
  profile.hidden = !accountClient || !accountUser;
  passwordForm.closest("details").hidden = !emailSignInAvailable;
  profile.querySelector(".account-email-settings").hidden = !emailUpdatesAvailable;
}

function setAccountMode(mode) {
  accountMode = mode;
  for (const button of modeButtons) button.setAttribute("aria-pressed", String(button.dataset.accountMode === mode));
  const byCode = mode === "code";
  passwordInput.hidden = passwordInput.disabled = byCode;
  emailForm.querySelector(".account-password-label").hidden = byCode;
  passwordInput.required = !byCode;
  passwordInput.minLength = mode === "signup" ? 8 : 0;
  passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";
  emailForm.querySelector(".account-submit").textContent = t(mode === "signup" ? "Create an account" : byCode ? "Send sign-in code" : "Sign in");
  codeSwitch.textContent = t(byCode ? "Use a password instead" : "Use an email code instead");
  codeSwitch.hidden = mode === "signup";
}

function renderProfiles() {
  const selected = savedProfiles.find(({ slot }) => slot === activeProfile);
  profilePicker.replaceChildren(...savedProfiles.map(({ slot, name }) => {
    const button = document.createElement("button");
    button.className = "account-profile-choice";
    button.type = "button";
    button.dir = "auto";
    button.textContent = name;
    button.setAttribute("aria-pressed", String(slot === activeProfile));
    button.addEventListener("click", () => selectProfile(slot));
    return button;
  }));
  profileAdd.hidden = savedProfiles.length >= 5;
  profileEdit.hidden = !selected;
}

function selectProfile(slot) {
  activeProfile = slot;
  try { localStorage.setItem(`nasaem-profile:${accountUser.id}`, slot); } catch {}
  profileForm.hidden = true;
  renderProfiles();
  profilePicker.querySelector('[aria-pressed="true"]')?.focus();
}

async function refreshProfiles(userId) {
  const { data, error } = await accountClient.from("customer_profiles").select("slot,name").order("slot");
  if (accountUser?.id !== userId || !account.open) return;
  if (error) {
    accountMessage("We couldn’t load your profiles. Please try again.");
    return;
  }
  savedProfiles = data;
  try { activeProfile = Number(localStorage.getItem(`nasaem-profile:${userId}`)); } catch {}
  if (!data.some(({ slot }) => slot === activeProfile)) activeProfile = data[0]?.slot;
  renderProfiles();
}

function editProfile(slot) {
  editingProfile = slot;
  profileForm.elements.profileName.value = savedProfiles.find(item => item.slot === slot)?.name ?? "";
  profileForm.hidden = false;
  profileForm.elements.profileName.focus();
}

profileAdd.addEventListener("click", () => editProfile(undefined));
profileEdit.addEventListener("click", () => editProfile(activeProfile));
profileForm.addEventListener("submit", async event => {
  event.preventDefault();
  const userId = accountUser?.id;
  const name = profileForm.elements.profileName.value.trim();
  if (!userId || !name) return;
  const slot = editingProfile ?? [1, 2, 3, 4, 5].find(value => !savedProfiles.some(item => item.slot === value));
  if (!slot) return;
  const button = profileForm.querySelector("button");
  button.disabled = true;
  try {
    const table = accountClient.from("customer_profiles");
    const { error } = await (editingProfile ? table.update({ name }).eq("slot", slot) : table.insert({ slot, name }));
    if (accountUser?.id !== userId || !account.open) return;
    if (error) {
      await refreshProfiles(userId);
      accountMessage("We couldn’t save your profile. Please try again.");
      return;
    }
    await refreshProfiles(userId);
    if (accountUser?.id !== userId || !account.open) return;
    selectProfile(slot);
    accountMessage("Profile saved.");
  } finally {
    button.disabled = false;
  }
});

async function refreshAccount() {
  showAccount();
  if (!accountUser) return;
  profile.querySelector(".account-address").textContent = accountUser.email;
  const userId = accountUser.id;
  await refreshProfiles(userId);
  if (!emailUpdatesAvailable || accountUser?.id !== userId) return;
  const [settings, alerts] = await Promise.all([
    accountClient.from("email_preferences").select("news").eq("user_id", userId).maybeSingle(),
    accountClient.from("restock_watches").select("scent_id").eq("user_id", userId)
  ]);
  if (accountUser?.id !== userId) return;
  if (settings.error || alerts.error) {
    accountMessage("We couldn’t update your account. Please try again.");
    return;
  }
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
  if (!emailUpdatesAvailable || !restockRequest || !accountUser) return;
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
  savedProfiles = [];
  activeProfile = undefined;
  profilePicker.replaceChildren();
  profileForm.hidden = profileAdd.hidden = profileEdit.hidden = true;
  unavailable.textContent = t("Loading your account…");
  setAccountMode("signin");
  accountMessage();
  showAccount();
  account.showModal();
  try {
    await prepareAccount();
    if (!account.open) return;
    if (accountUser) await saveRestockRequest();
    else if (scentId) accountMessage("Sign in for a restock alert for {name}.", { name: scents.find(({ id }) => id === scentId).name });
    await refreshAccount();
  } catch {
    unavailable.hidden = false;
    unavailable.textContent = t("We couldn’t load your account. Close this panel and try again.");
  }
}

accountToggle.hidden = false;
accountToggle.addEventListener("click", () => openAccount());
account.querySelector(".close").addEventListener("click", () => account.close());
account.addEventListener("close", () => {
  codeForm.reset();
  passwordInput.value = "";
  passwordForm.reset();
  passwordForm.closest("details").open = false;
  (accountOpener?.isConnected ? accountOpener : accountToggle).focus({ preventScroll: true });
});

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    accountMessage();
    setAccountMode(button.dataset.accountMode);
  });
}
codeSwitch.addEventListener("click", () => {
  accountMessage();
  setAccountMode(accountMode === "code" ? "signin" : "code");
});

async function accountSignedIn(user) {
  accountUser = user;
  requestedEmail = undefined;
  passwordInput.value = "";
  codeForm.reset();
  accountMessage();
  await saveRestockRequest();
  await refreshAccount();
  if (account.open) profile.querySelector(".account-signout").focus();
}

googleButton.addEventListener("click", async () => {
  if (!accountClient || !googleSignInAvailable) return;
  googleButton.disabled = true;
  accountMessage();
  try {
    const redirectTo = new URL("./?auth=google", location.href);
    try { sessionStorage.setItem("nasaem-google-scent", restockRequest ?? ""); } catch {}
    const { error } = await accountClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo.href } });
    if (error) throw error;
  } catch {
    accountMessage("Google sign-in didn’t finish. Please try again.");
    googleButton.disabled = false;
  }
});

emailForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!emailSignInAvailable || !accountClient) return;
  const button = emailForm.querySelector(".account-submit");
  const email = emailForm.elements.email.value.trim();
  const password = passwordInput.value;
  const mode = accountMode;
  button.disabled = true;
  for (const option of [...modeButtons, codeSwitch]) option.disabled = true;
  try {
    const auth = accountClient.auth;
    const { data, error } = await (mode === "signup" ? auth.signUp({ email, password })
      : mode === "code" ? auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      : auth.signInWithPassword({ email, password }));
    if (error) throw error;
    if (!account.open) return;
    if (data.session) return await accountSignedIn(data.session.user);
    requestedEmail = email;
    accountMessage();
    showAccount();
    codeForm.elements.code.focus();
  } catch {
    accountMessage(mode === "signup" ? "We couldn’t create the account. Check your email and use at least 8 characters for your password."
      : mode === "code" ? "We couldn’t send a code. Please try again shortly."
      : "We couldn’t sign you in. Check your password or use an email code.");
  } finally {
    button.disabled = false;
    for (const option of [...modeButtons, codeSwitch]) option.disabled = false;
  }
});

codeForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!emailSignInAvailable || !accountClient || !requestedEmail) return;
  const button = codeForm.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    const { data, error } = await accountClient.auth.verifyOtp({
      email: requestedEmail, token: codeForm.elements.code.value.trim(), type: "email"
    });
    if (error) throw error;
    await accountSignedIn(data.user);
  } catch {
    accountMessage("This code couldn’t be verified. Check it or request a new one.");
  } finally {
    button.disabled = false;
  }
});

passwordForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!accountUser) return;
  const button = passwordForm.querySelector("button");
  button.disabled = true;
  try {
    const { error } = await accountClient.auth.updateUser({ password: passwordForm.elements.password.value });
    if (error) throw error;
    passwordForm.reset();
    passwordForm.closest("details").open = false;
    accountMessage("Password saved.");
  } catch {
    accountMessage("We couldn’t save your password. Sign in with an email code and try again.");
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
  if (!emailUpdatesAvailable || !accountUser) return;
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
  setAccountMode("signin");
  accountMessage();
  showAccount();
  (emailSignInAvailable ? emailForm.elements.email : googleButton).focus();
});

document.addEventListener("nasaem:language", () => {
  setAccountMode(accountMode);
  if (accountFeedback) accountMessage(...accountFeedback);
  if (account.open && accountUser) refreshAccount().catch(() => {});
});
if (accountConfigured) {
  fetch(`${nasaemAccountConfig.url}/rest/v1/inventory?select=scent_id,status`, {
    headers: { apikey: nasaemAccountConfig.publishableKey }
  }).then(response => response.ok ? response.json() : []).then(items => {
    for (const item of items) stock.set(item.scent_id, item.status);
    document.dispatchEvent(new Event("nasaem:availability"));
  }).catch(() => {});
}

if (googleSignInAvailable && new URL(location.href).searchParams.get("auth") === "google") {
  document.addEventListener("DOMContentLoaded", async () => {
    let scentId;
    try {
      scentId = sessionStorage.getItem("nasaem-google-scent");
      sessionStorage.removeItem("nasaem-google-scent");
    } catch {}
    await openAccount(accountToggle, scents.some(({ id }) => id === scentId) ? scentId : undefined);
    if (!accountUser) accountMessage("Google sign-in didn’t finish. Please try again.");
    history.replaceState(history.state, "", new URL("./", location.href));
  }, { once: true });
}
