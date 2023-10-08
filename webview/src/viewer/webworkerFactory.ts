const workerUri = (document.querySelector("#script") as HTMLElement)?.dataset
  ?.workerUri;

if (workerUri == null) {
  throw new Error("Webworker URL is missing");
}

const workerObjectURLPromise = (async function () {
  const workerFetched = await fetch(workerUri);
  const workerCode = await workerFetched.text();
  const blob = new Blob([workerCode], { type: "text/javascript" });
  return URL.createObjectURL(blob);
})();

export default async function webworkerFactory() {
  return new Worker(await workerObjectURLPromise);
}
