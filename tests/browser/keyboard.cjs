const { chromium, webkit } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  for (const [name, engine] of Object.entries({ chromium, webkit })) {
    const b = await engine.launch();
    const p = await b.newPage({ viewport: { width: 320, height: 568 } });
    await p.goto(
      (process.env.BASE_URL || "http://localhost:3000") + "/notes/new",
    );
    const title = p.getByLabel("Название заметки");
    await title.fill("Начало");
    await p.getByRole("button", { name: "Сохранить", exact: true }).click();
    await p.getByRole("link", { name: "Редактировать Начало" }).click();
    await title.waitFor();
    await title.press("End");
    await title.pressSequentially(" текста");
    await title.press("Meta+z");
    const nativeValue = await title.inputValue();
    assert.notEqual(nativeValue, "Начало текста");
    assert(nativeValue.startsWith("Начало"));
    await p.getByRole("link", { name: "Все заметки" }).focus();
    await p.keyboard.press("Meta+z");
    assert.equal(await title.inputValue(), "Начало");
    await p.keyboard.press("Meta+Shift+z");
    assert.equal(await title.inputValue(), nativeValue);
    await p
      .getByRole("button", { name: "Выйти без сохранения", exact: true })
      .click();
    assert.equal(
      await p.evaluate(() => document.activeElement.textContent.trim()),
      "Продолжить редактирование",
    );
    await p.keyboard.press("Shift+Tab");
    assert.equal(
      await p.evaluate(() => document.activeElement.textContent.trim()),
      "Выйти без сохранения",
    );
    await p.keyboard.press("Tab");
    assert.equal(
      await p.evaluate(() => document.activeElement.textContent.trim()),
      "Продолжить редактирование",
    );
    await p.keyboard.press("Escape");
    await title.fill("Восстановить текст");
    await p.waitForTimeout(600);
    const path = new URL(p.url()).pathname.split("/").pop();
    await p.reload();
    await p.getByRole("dialog").waitFor();
    await p.keyboard.press("Escape");
    assert.equal(await p.getByRole("dialog").count(), 0);
    assert(
      await p.evaluate(
        (id) => !!localStorage.getItem("notebook:draft:v1:" + id),
        path,
      ),
    );
    await p.getByRole("button", { name: "Восстановить", exact: true }).click();
    assert.equal(await title.inputValue(), "Восстановить текст");
    await p.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.setViewportSize({ width: 844, height: 390 });
    assert(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    console.log(
      name +
        " PASS: native undo/global undo-redo/focus trap/safe escape/recovery/200%/landscape",
    );
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
