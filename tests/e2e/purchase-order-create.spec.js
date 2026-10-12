const { test, expect } = require('@playwright/test');

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

async function approvedRequisition(request) {
  const itemName = `PO test part ${Date.now()}`;
  const response = await request.post(`${apiUrl}/api/requisitions`, {
    data: {
      requesterName: 'PO E2E', departmentName: 'Workshop', title: itemName,
      lines: [{ itemCode: 'PO-E2E', itemName, qtyRequested: 10,
        uom: 'PCS', estUnitPrice: 1250, siteCode: 'WH-JKT' }],
    },
  });
  expect(response.status()).toBe(201);
  const requisition = await response.json();
  expect((await request.post(`${apiUrl}/api/requisitions/${requisition.id}/submit`)).ok()).toBeTruthy();
  expect((await request.post(`${apiUrl}/api/requisitions/${requisition.id}/approve`)).ok()).toBeTruthy();
  return { ...requisition, itemName };
}

function allocationPayload(requisition, qtyOrdered) {
  const line = requisition.lines[0];
  return {
    vendorName: 'PO E2E Supplier',
    lines: [{ prLineId: line.id, itemCode: line.itemCode, itemName: line.itemName,
      uom: line.uom, siteCode: line.siteCode, unitPrice: 1250, qtyOrdered }],
  };
}

async function fillOrder(page, requisition, quantity) {
  await page.goto('/purchase-orders/new');
  await page.getByRole('checkbox', { name: `Select ${requisition.prNumber} line 1`, exact: true }).check();
  await page.getByLabel('Vendor', { exact: true }).fill('PO E2E Supplier');
  await page.getByLabel(`Order quantity for ${requisition.itemName}`, { exact: true }).fill(String(quantity));
}

test('saves a real draft and submits it without creating a second PO', async ({ page, request }) => {
  const requisition = await approvedRequisition(request);
  await fillOrder(page, requisition, 2);
  const createdResponse = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save As Draft', exact: true }).click();
  const response = await createdResponse;
  expect(response.status()).toBe(201);
  const order = await response.json();
  await expect(page.getByRole('status')).toContainText(`${order.poNumber}: draft saved.`);
  await expect(page.getByLabel('Vendor', { exact: true })).toBeDisabled();

  let createsAfterSave = 0;
  page.on('request', (outgoing) => {
    if (outgoing.url() === `${apiUrl}/api/purchase-orders` && outgoing.method() === 'POST') createsAfterSave++;
  });
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  await expect(page.getByRole('status')).toContainText(`${order.poNumber}: submitted.`);
  expect(createsAfterSave).toBe(0);
  const detail = await request.get(`${apiUrl}/api/purchase-orders/${order.id}`);
  expect((await detail.json()).status).toBe('SUBMITTED');
  const invalidSubmit = await request.post(`${apiUrl}/api/purchase-orders/${order.id}/submit`);
  expect(invalidSubmit.status()).toBe(422);
  expect((await invalidSubmit.json()).message).toBe('Only DRAFT purchase order can be submitted');
});

test('shows stale-allocation 422 errors and submits exact remaining quantity on mobile', async ({ page, request }, testInfo) => {
  const requisition = await approvedRequisition(request);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await fillOrder(page, requisition, 3);
  await page.screenshot({ path: testInfo.outputPath('create-po-desktop.png'), fullPage: true });

  const duplicatePayload = allocationPayload(requisition, 6);
  duplicatePayload.lines.push({ ...duplicatePayload.lines[0] });
  const duplicateResponse = await request.post(`${apiUrl}/api/purchase-orders`, { data: duplicatePayload });
  expect(duplicateResponse.status()).toBe(422);
  expect((await duplicateResponse.json()).message).toBe('lines[1]: allocation qty 12 exceeds remaining 10');

  const competingOrder = await request.post(`${apiUrl}/api/purchase-orders`, {
    data: allocationPayload(requisition, 8),
  });
  expect(competingOrder.status()).toBe(201);
  const rejectedResponse = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  expect((await rejectedResponse).status()).toBe(422);
  await expect(page.getByRole('alert')).toHaveText('lines[0]: allocation qty 3 exceeds remaining 2');

  await page.getByRole('button', { name: 'Refresh Open Lines', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('allocation qty 3 exceeds remaining 2');
  await page.getByLabel(`Order quantity for ${requisition.itemName}`, { exact: true }).fill('2');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Submit PO', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Submit PO', exact: true })).toBeInViewport();
  const poBounds = await page.locator('.purchase-order-page').boundingBox();
  expect(poBounds.x).toBeGreaterThanOrEqual(0);
  expect(poBounds.x + poBounds.width).toBeLessThanOrEqual(390);
  expect(await page.locator('.table-scroll').evaluate((element) =>
    element.scrollWidth > element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('create-po-mobile.png'), fullPage: true });

  const createdResponse = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/purchase-orders` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Submit PO', exact: true }).click();
  const order = await (await createdResponse).json();
  await expect(page.getByRole('status')).toContainText(`${order.poNumber}: submitted.`);
  const openLines = await request.get(`${apiUrl}/api/purchase-orders/${order.id}/open-lines`);
  expect((await openLines.json()).openLines[0].qtyOpenForGr).toBe(2);
  const prOpenLines = await request.get(`${apiUrl}/api/requisitions/${requisition.id}/open-lines`);
  expect((await prOpenLines.json()).openLines).toHaveLength(0);
});