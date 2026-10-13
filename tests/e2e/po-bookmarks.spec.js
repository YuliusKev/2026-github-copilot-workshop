const { test, expect } = require('@playwright/test');

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

async function createPurchaseOrder(request) {
  const itemName = `PO bookmark item ${Date.now()}`;
  const requisitionResponse = await request.post(`${apiUrl}/api/requisitions`, {
    data: {
      requesterName: 'PO Bookmark E2E',
      departmentName: 'Workshop',
      title: itemName,
      lines: [{
        itemCode: 'PO-BOOKMARK-E2E',
        itemName,
        qtyRequested: 2,
        uom: 'PCS',
        estUnitPrice: 250,
        siteCode: 'WH-JKT',
      }],
    },
  });
  expect(requisitionResponse.status()).toBe(201);
  const requisition = await requisitionResponse.json();

  expect((await request.post(`${apiUrl}/api/requisitions/${requisition.id}/submit`)).ok()).toBeTruthy();
  expect((await request.post(`${apiUrl}/api/requisitions/${requisition.id}/approve`)).ok()).toBeTruthy();

  const line = requisition.lines[0];
  const purchaseOrderResponse = await request.post(`${apiUrl}/api/purchase-orders`, {
    data: {
      vendorName: 'PO Bookmark Supplier',
      lines: [{
        prLineId: line.id,
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        unitPrice: line.estUnitPrice,
        qtyOrdered: 1,
      }],
    },
  });
  expect(purchaseOrderResponse.status()).toBe(201);
  return purchaseOrderResponse.json();
}

test('bookmarks a PO, filters it, and removes the bookmark', async ({ page, request }) => {
  const purchaseOrder = await createPurchaseOrder(request);
  const purchaseOrderRow = page.getByRole('row').filter({ hasText: purchaseOrder.poNumber });

  await page.goto('/purchase-orders');
  await expect(purchaseOrderRow.getByRole('button', { name: 'Bookmark purchase order' })).toBeVisible();

  const bookmarkResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders/${purchaseOrder.id}/bookmark`
      && response.request().method() === 'POST');
  await purchaseOrderRow.getByRole('button', { name: 'Bookmark purchase order' }).click();
  const bookmarkResponse = await bookmarkResponsePromise;
  expect(bookmarkResponse.status()).toBe(200);
  expect((await bookmarkResponse.json()).isBookmarked).toBe(true);
  await expect(purchaseOrderRow.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  await purchaseOrderRow.getByRole('link', { name: purchaseOrder.poNumber, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  await page.goto('/purchase-orders');
  const filteredListResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders?bookmarked=true`);
  await page.getByRole('checkbox', { name: 'Bookmarked only' }).check();
  const filteredListResponse = await filteredListResponsePromise;
  const filteredItems = (await filteredListResponse.json()).items;
  expect(filteredItems.some((item) => item.id === purchaseOrder.id)).toBe(true);
  expect(filteredItems.every((item) => item.isBookmarked)).toBe(true);
  await expect(purchaseOrderRow.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  const removeResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders/${purchaseOrder.id}/bookmark`
      && response.request().method() === 'DELETE');
  await purchaseOrderRow.getByRole('button', { name: 'Remove bookmark' }).click();
  const removeResponse = await removeResponsePromise;
  expect(removeResponse.status()).toBe(200);
  expect((await removeResponse.json()).isBookmarked).toBe(false);
  await expect(purchaseOrderRow).toHaveCount(0);

  const detailResponse = await request.get(`${apiUrl}/api/purchase-orders/${purchaseOrder.id}`);
  expect((await detailResponse.json()).isBookmarked).toBe(false);
});