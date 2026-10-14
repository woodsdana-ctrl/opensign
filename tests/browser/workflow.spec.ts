import { test, expect } from "@playwright/test";
import sharp from "sharp";
test("dashboard uploads reach a separate player; timing, order and updates work", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByLabel("Screen name", { exact: true }).fill("Test TV");
  await page.getByRole("button", { name: "Create screen" }).click();
  await expect(page.getByRole("heading", { name: "Test TV" })).toBeVisible();
  await page.getByRole("button", { name: "Media library" }).click();
  const files = [];
  for (const color of ["red", "green", "blue"])
    files.push({
      name: `${color}.png`,
      mimeType: "image/png",
      buffer: await sharp({
        create: { width: 160, height: 90, channels: 3, background: color },
      })
        .png()
        .toBuffer(),
    });
  await page.getByLabel("Upload images", { exact: true }).setInputFiles(files);
  await expect(page.getByRole("status")).toContainText("Images uploaded");
  await page.getByRole("button", { name: "Playlists", exact: false }).click();
  await page
    .getByLabel("Playlist name", { exact: true })
    .fill("Morning Announcements");
  await page.getByRole("button", { name: "Create playlist" }).click();
  for (const file of files) {
    await page
      .getByLabel("Add image", { exact: true })
      .selectOption({ label: file.name });
  }
  await expect(page.getByLabel("Duration for item 1")).toHaveValue("10");
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Playlist saved");
  const preview = await context.newPage();
  await preview.goto(
    (await page
      .getByRole("link", { name: "Preview saved playlist" })
      .getAttribute("href")) as string,
  );
  await expect(preview.getByRole("img")).toHaveAttribute("alt", "red.png");
  await preview.close();
  await page.getByRole("button", { name: "Screens", exact: false }).click();
  await page
    .getByLabel("Playlist for Test TV")
    .selectOption({ label: "Morning Announcements" });
  await expect(page.getByRole("status")).toContainText("Assignment saved");
  const player = await context.newPage();
  await player.clock.install();
  await player.goto(
    (await page
      .getByRole("link", { name: "Open player" })
      .getAttribute("href")) as string,
  );
  await expect(player.getByRole("img")).toHaveAttribute("alt", "red.png");
  await player.clock.fastForward(9000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "red.png");
  await player.clock.fastForward(1000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "green.png");
  await player.clock.fastForward(10000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "blue.png");
  await player.clock.fastForward(10000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "red.png");
  await page.getByRole("button", { name: "Playlists", exact: false }).click();
  await page.getByRole("button", { name: "Morning Announcements" }).click();
  await page
    .getByRole("button", { name: "Move up item 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move up item 2", exact: true })
    .click();
  await page.getByLabel("Duration for item 1").fill("2");
  await page
    .getByRole("button", { name: "Save playlist", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Playlist saved");
  await player.clock.fastForward(5000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "blue.png");
  await player.clock.fastForward(2000);
  await expect(player.getByRole("img")).toHaveAttribute("alt", "red.png");
  // Failed media produces a fallback, and later slides still play.
  await player.route("**/media/**", (route) => route.abort());
  await player.reload();
  await expect(
    player.getByRole("heading", { name: "Image unavailable" }),
  ).toBeVisible();
  await player.unroute("**/media/**");
  await page.getByRole("button", { name: "Screens", exact: false }).click();
  await page.getByLabel("Playlist for Test TV").selectOption("");
  await expect(page.getByRole("status")).toContainText("Assignment saved");
  await player.clock.fastForward(5000);
  await expect(player.getByRole("heading", { name: "Test TV" })).toBeVisible();
  await page.screenshot({
    path: "/tmp/opensign-dashboard.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Open player" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/opensign-mobile.png", fullPage: true });
  await player.close();
});
