const { test, expect } = require('@playwright/test');

const apiUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3000';

async function createSubmittedPurchaseOrder(request) {
  const itemName = `Goods receipt E2E item ${Date.now()}`;
  const requisitionResponse = await request.post(`${apiUrl}/api/requisitions`, {
    data: {
      requesterName: 'Goods Receipt E2E',
      departmentName: 'Workshop',
      title: itemName,
      lines: [{
        itemCode: 'GR-E2E-ITEM',
        itemName,
        qtyRequested: 10,
        uom: 'PCS',
        estUnitPrice: 1250,
        siteCode: 'WH-JKT',
      }],
    },
  });
  expect(requisitionResponse.status()).toBe(201);
  const requisition = await requisitionResponse.json();

  const submitRequisitionResponse = await request.post(
    `${apiUrl}/api/requisitions/${requisition.id}/submit`
  );
  expect(submitRequisitionResponse.ok()).toBeTruthy();
  const approveRequisitionResponse = await request.post(
    `${apiUrl}/api/requisitions/${requisition.id}/approve`
  );
  expect(approveRequisitionResponse.ok()).toBeTruthy();

  const line = requisition.lines[0];
  const purchaseOrderResponse = await request.post(`${apiUrl}/api/purchase-orders`, {
    data: {
      vendorName: 'Goods Receipt E2E Supplier',
      lines: [{
        prLineId: line.id,
        itemCode: line.itemCode,
        itemName: line.itemName,
        uom: line.uom,
        siteCode: line.siteCode,
        unitPrice: line.estUnitPrice,
        qtyOrdered: 10,
      }],
    },
  });
  expect(purchaseOrderResponse.status()).toBe(201);
  const purchaseOrder = await purchaseOrderResponse.json();

  const submitPurchaseOrderResponse = await request.post(
    `${apiUrl}/api/purchase-orders/${purchaseOrder.id}/submit`
  );
  expect(submitPurchaseOrderResponse.ok()).toBeTruthy();

  return { itemName, purchaseOrder };
}

test('creates, lists, opens, and posts a partial goods receipt', async ({ page, request }) => {
  const { itemName, purchaseOrder } = await createSubmittedPurchaseOrder(request);

  await page.goto(`/purchase-orders/${purchaseOrder.id}`);
  await expect(page.getByRole('heading', { name: 'Purchase Order Detail' })).toBeVisible();
  await page.getByRole('link', { name: 'Receive Goods', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Goods Receipt' })).toBeVisible();
  await expect(page.getByLabel('Purchase Order')).toHaveValue(purchaseOrder.id);

  await page.getByLabel(`Receive ${itemName}`, { exact: true }).check();
  await page.getByLabel(`Received quantity for ${itemName}`, { exact: true }).fill('4');
  await expect(page.getByLabel(`Actual site for ${itemName}`, { exact: true }))
    .toHaveValue('WH-JKT');

  const createResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/goods-receipts`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save As Draft', exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const receipt = await createResponse.json();
  await expect(page.getByRole('heading', { name: 'Goods Receipt Detail' })).toBeVisible();
  await expect(page.getByText('DRAFT', { exact: true })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: itemName })).toContainText('4');

  await page.getByRole('link', { name: 'Goods Receipts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Goods Receipts' })).toBeVisible();
  await expect(page.getByRole('link', { name: receipt.grNumber, exact: true })).toBeVisible();
  await page.getByRole('link', { name: receipt.grNumber, exact: true }).click();

  const postResponsePromise = page.waitForResponse((response) =>
    response.url() === `${apiUrl}/api/goods-receipts/${receipt.id}/post`
      && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Post Receipt', exact: true }).click();
  const postResponse = await postResponsePromise;
  expect(postResponse.status()).toBe(200);
  expect((await postResponse.json()).status).toBe('POSTED');
  await expect(page.getByText('POSTED', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Post Receipt', exact: true })).toHaveCount(0);

  const openLinesResponse = await request.get(
    `${apiUrl}/api/purchase-orders/${purchaseOrder.id}/open-lines`
  );
  expect(openLinesResponse.ok()).toBeTruthy();
  const openLines = await openLinesResponse.json();
  expect(openLines.openLines[0].qtyOpenForGr).toBe(6);
});