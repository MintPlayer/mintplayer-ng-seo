import { expect, test } from '@playwright/test';

// Smoke tests for what the libraries write into <head> on the demo app.

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('sets the title and the description/OpenGraph tags', async ({
    page,
  }) => {
    await expect(page).toHaveTitle('Hello world 1');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Welcome 1'
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Hello world 1'
    );
    await expect(
      page.locator('meta[property="og:description"]')
    ).toHaveAttribute('content', 'Welcome 1');
  });

  test('adds the canonical URL, the hreflang alternates and the JSON-LD', async ({
    page,
  }) => {
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/$/
    );
    for (const lang of ['en', 'fr', 'nl']) {
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${lang}"]`)
      ).toHaveCount(1);
    }
    await expect(
      page.locator('link[rel="alternate"][hreflang="fr"]')
    ).toHaveAttribute('href', /lang=fr/);

    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(JSON.parse(jsonLd ?? '')).toEqual({
      title: 'Whatever 1',
      artist: 'Oasis',
    });
  });

  test('updates the tags in place when the inputs change', async ({ page }) => {
    await page.getByRole('button', { name: 'Increment counter' }).click();

    await expect(page).toHaveTitle('Hello world 2');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Welcome 2'
    );
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]')
    ).toHaveAttribute('href', /id=2/);
  });
});

test('navigating replaces the canonical URL instead of adding one', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);

  await page.getByRole('link', { name: 'About' }).click();

  await expect(page.getByText('about works!')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/about$/
  );
});
