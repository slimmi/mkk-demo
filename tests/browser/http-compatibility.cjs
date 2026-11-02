const assert = require("node:assert/strict");
const { chromium, webkit } = require("@playwright/test");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        Object.defineProperty(crypto, "randomUUID", { value: undefined });
        Object.defineProperty(navigator, "locks", { value: undefined });
      });
      const page = await context.newPage();
      await page.goto(`${baseUrl}/notes/new`);
      await page.getByLabel("Название заметки").fill("HTTP compatibility");
      await page.getByRole("button", { name: "Добавить задачу" }).click();
      await page.getByLabel("Текст задачи 1").fill("Task");
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await page.getByRole("heading", { name: "HTTP compatibility" }).waitFor();
      await page
        .getByRole("link", { name: "Редактировать HTTP compatibility" })
        .click();
      await page.getByLabel("Название заметки").waitFor();
      await page.reload();
      assert.equal(
        await page.getByLabel("Текст задачи 1").inputValue(),
        "Task",
      );

      const tabs = await Promise.all([context.newPage(), context.newPage()]);
      await Promise.all(tabs.map((tab) => tab.goto(`${baseUrl}/notes/new`)));
      await Promise.all(
        tabs.map((tab, index) =>
          tab.getByLabel("Название заметки").fill(`Concurrent ${index}`),
        ),
      );
      await Promise.all(
        tabs.map((tab) =>
          tab.getByRole("button", { name: "Сохранить", exact: true }).click(),
        ),
      );
      await Promise.all(tabs.map((tab) => tab.waitForURL(`${baseUrl}/`)));
      const titles = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("notebook:notes:v1")).notes.map(
          (note) => note.title,
        ),
      );
      assert.deepEqual(titles.sort(), [
        "Concurrent 0",
        "Concurrent 1",
        "HTTP compatibility",
      ]);
      console.log(
        `${engine.name()} PASS: creation, tasks, save, reload and concurrent saves without secure-context APIs`,
      );
    } finally {
      await browser.close();
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
