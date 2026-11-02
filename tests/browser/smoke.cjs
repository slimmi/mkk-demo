const { chromium, firefox, webkit } = require("@playwright/test");
const assert = require("node:assert/strict");
const base = process.env.BASE_URL || "http://localhost:3000";
(async () => {
  const engines = { chromium, firefox, webkit };
  for (const name of (process.env.BROWSERS || "chromium,firefox,webkit").split(
    ",",
  )) {
    const engine = engines[name];
    const browser = await engine.launch({ headless: true, timeout: 15000 });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .getByRole("link", { name: "Создать заметку", exact: true })
      .click();
    await page.getByLabel("Название заметки").fill("Мой день");
    await page.getByRole("button", { name: "Добавить задачу" }).click();
    await page.getByLabel("Текст задачи 1").fill("Прочитать книгу");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("heading", { name: "Мой день" }).waitFor();
    await page.getByRole("link", { name: "Редактировать Мой день" }).click();
    await page.getByLabel("Название заметки").waitFor();
    const url = page.url();
    await page.getByLabel("Название заметки").fill("Черновик");
    await page.waitForTimeout(650);
    await page.reload();
    await page
      .getByRole("button", { name: "Восстановить", exact: true })
      .click();
    assert.equal(
      await page.getByLabel("Название заметки").inputValue(),
      "Черновик",
    );
    await page.getByRole("link", { name: "Все заметки" }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page
      .getByRole("button", { name: "Выйти без сохранения", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Продолжить редактирование" })
      .waitFor();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Выйти без сохранения" })
      .click();
    await page.getByRole("heading", { name: "Мой день" }).waitFor();
    await page.goto(url);
    await page.getByLabel("Название заметки").fill(" ");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    assert.equal(
      await page.locator("#note-title").getAttribute("aria-invalid"),
      "true",
    );
    await page.getByLabel("Название заметки").fill("Мой день");
    await page.setViewportSize({ width: 320, height: 568 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: `/tmp/notes-${name}-mobile.png`,
      fullPage: true,
    });
    const other = await context.newPage();
    await other.goto(base);
    await other.getByRole("button", { name: "Удалить Мой день" }).click();
    await other
      .getByRole("dialog")
      .getByRole("button", { name: "Удалить", exact: true })
      .click();
    await page.getByText("Эта заметка удалена").waitFor();
    assert(
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .isDisabled(),
    );
    await page.goto(base + "/notes/missing");
    await page.getByRole("heading", { name: "Заметка не найдена" }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      name +
        " PASS: create/save/reload/recovery/guard/dialog/validation/320px/cross-tab/missing",
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
