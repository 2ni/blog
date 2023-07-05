const downloadForm = document.getElementById("downloadForm");
const inputUrl = document.getElementById("url");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressBarText = progressContainer.querySelector("span");
const progressLog = document.getElementById("progressLog");
const downloadLinkContainer = document.getElementById("downloadLinkContainer");
const downloadLink = document.getElementById("downloadLink");
const audioCheckbox = document.getElementById("audio");
const audioWrapper = document.getElementById("audioWrapper");
const infoCheckbox = document.getElementById("info");
const resolution = document.getElementById("resolution");
let interval;

downloadForm.addEventListener("submit", (event) => {
  event.preventDefault();

  // downloadForm.style.display = "none";
  // progressContainer.style.display = "block";
  interval = setInterval(checkProgress, 1000)

  downloadLinkContainer.style.display = "none";
  progressBar.value = 0;
  progressBarText.innerText = "";
  progressLog.innerText = "";

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/yt/download");
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      clearInterval(interval);
      const resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        if (resp.info) {
          progressLog.innerText = resp.info.join("\n");
          return;
        }

        // progressContainer.style.display = "none";
        downloadLinkContainer.style.display = "block";
        downloadLink.href = "/yt/file/" + resp.filename;
        downloadLink.innerText = resp.filename;
        progressBar.value = resp.percentComplete;
        progressBarText.innerText = resp.eta;
        progressLog.innerText = resp.logs.join("\n");
        downloadLink.click(); // start download
      } else {
        progressLog.innerText = resp.logs.join("\n");
      }
    }
  };

  const formData = new FormData(downloadForm);
  xhr.send(formData);
});

const checkProgress = () => {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "/yt/progress");
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      const progress = JSON.parse(xhr.responseText);
      progressBar.value = progress.percentComplete;
      progressBarText.innerText = progress.eta;
      progressLog.innerText = progress.logs.join("\n");
      if (!progress.isComplete) {
      }
    }
  };
  xhr.send();
}

audioCheckbox.addEventListener("change", () => {
  resolution.style.display = audioCheckbox.checked ? "none" : "inline";
});

infoCheckbox.addEventListener("change", () => {
  resolution.style.display = infoCheckbox.checked ? "none" : "inline";
  audioWrapper.style.display = infoCheckbox.checked ? "none" : "inline";
});

inputUrl.addEventListener("input", () => {
  downloadLinkContainer.style.display = "none";
  progressBar.value = 0;
  progressBarText.innerText = "";
  progressLog.innerText = "";
});

window.addEventListener("load", () => {
});
