const token = location.hash.slice(1);
const unsubscribeStatus = document.querySelector("#unsubscribe-status");
const unsubscribeForm = document.querySelector("#unsubscribe-form");
if (new URLSearchParams(location.search).get("done") === "1") {
  unsubscribeStatus.textContent = "You’re unsubscribed from Nasaem fragrance launches and news.";
} else if (nasaemAccountConfig.url.startsWith("https://") && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(token)) {
  unsubscribeStatus.textContent = "Stop receiving Nasaem fragrance launches and news?";
  const endpoint = new URL("/functions/v1/fragrance-email", nasaemAccountConfig.url);
  endpoint.search = new URLSearchParams({ unsubscribe: token, manual: "1" });
  unsubscribeForm.action = endpoint;
  unsubscribeForm.hidden = false;
}
