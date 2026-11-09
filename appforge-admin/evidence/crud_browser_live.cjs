#!/usr/bin/env node
// Live Chromium + generated API + PostgreSQL. No API mocks or customer data.
// Run only with credentials for the disposable database and a bound local API.
const path = require('node:path');
const fs = require('node:fs');
const cp = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const apiBase = process.env.APPFORGE_TEST_BASE || 'http://127.0.0.1:55502';
const passwordFile = process.env.APPFORGE_TEST_SECRET_PATH || '/tmp/appforge-crud-smoke/active-password.txt';
const username = process.env.APPFORGE_ADMIN_EMAIL;
const statuses = [];
let createdId = null, observedToken = null;

function expect(condition, message) { if (!condition) throw Error(message); }
function dbDeleted(id) {
  expect(/^[0-9a-f-]{36}$/.test(id), 'Invalid generated customer ID');
  const sql = 'SELECT "IsDeleted" FROM "Customers" WHERE "Id" = ' + "'" + id + "';";
  return cp.execFileSync('docker', [
    'exec', process.env.APPFORGE_TEST_DOCKER_CONTAINER || 'appforge-backoffice-crud-pg', 'psql', '-qtA',
    '-U', process.env.APPFORGE_TEST_DB_USER || 'appforge_smoke', '-d',
    process.env.APPFORGE_TEST_DB || 'business_operations_admin_v2', '-c', sql,
  ], { encoding:'utf8' }).trim();
}

async function main() {
  expect(username && fs.existsSync(passwordFile), 'Disposable test credentials missing');
  const { startStaticServer } = await import(pathToFileURL(path.join(
    root, 'generated/frontend-app/scripts/lighthouse/staticServer.mjs',
  )).href);
  const staticServer = await startStaticServer(path.join(root, 'generated/frontend-app/dist'));
  const endpoint = process.env.CDP_ENDPOINT;
  const browser = endpoint
    ? await chromium.connectOverCDP(endpoint)
    : await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const unique = 'UI Acceptance ' + Date.now().toString(36);
  const revised = unique + ' Updated';
  let context = null;
  try {
    context = await browser.newContext({ viewport:{ width:1920, height:1280 }, deviceScaleFactor:1 });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error=>pageErrors.push(error.message));
    await context.route('**/api/**', async route => {
      const req = route.request();
      const url = new URL(req.url());
      const response = await route.fetch({
        url: apiBase + url.pathname + url.search,
        timeout: 20000,
      });
      statuses.push({method:req.method(),path:url.pathname,status:response.status()});
      if (req.method()==='POST' && url.pathname==='/api/customers' && response.status()===201) {
        createdId = (await response.json()).id;
        observedToken = req.headers()['authorization'];
      }
      await route.fulfill({response});
    });
    await page.goto(staticServer.origin+'/#/customers',{waitUntil:'domcontentloaded'});
    await page.locator('#appforge-login').fill(username);
    await page.locator('#appforge-password').fill(fs.readFileSync(passwordFile,'utf8').trim());
    await page.locator('button[type=submit]').click();
    await page.getByRole('heading',{name:'Customers'}).first().waitFor({timeout:20000});
    await page.getByText('Northwind Studio',{exact:true}).waitFor({timeout:20000});
    expect(!pageErrors.length, pageErrors.join('; '));
    await page.screenshot({
      path:path.join(__dirname,'business-admin-customers-live.png'),fullPage:true,animations:'disabled',
    });
    console.log('LIVE_BROWSER_READ_PASS: generated table shows real PostgreSQL customers');

    await page.getByRole('button',{name:'Create Customer'}).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await dialog.locator('#customer-name').fill(unique);
    await dialog.locator('#customer-email').fill('ui-acceptance@example.test');
    await dialog.locator('#customer-segment').fill('Internal demo');
    await dialog.locator('#customer-note').fill('Created from generated React form');
    await page.screenshot({
      path:path.join(__dirname,'business-admin-create-live.png'),fullPage:true,animations:'disabled',
    });
    await dialog.getByRole('button',{name:'Create',exact:true}).click();
    await dialog.waitFor({state:'hidden',timeout:20000});
    await page.getByText(unique,{exact:true}).waitFor({timeout:20000});
    expect(createdId && dbDeleted(createdId)==='f', 'Create did not persist active row in PostgreSQL');
    console.log('LIVE_BROWSER_CREATE_PASS');

    let row=page.locator('.p-datatable-tbody tr').filter({hasText:unique});
    await row.getByRole('button',{name:'Edit'}).click();
    await dialog.waitFor();
    await dialog.locator('#customer-name').fill(revised);
    await page.screenshot({
      path:path.join(__dirname,'business-admin-edit-live.png'),fullPage:true,animations:'disabled',
    });
    await dialog.getByRole('button',{name:'Save',exact:true}).click();
    await dialog.waitFor({state:'hidden',timeout:20000});
    await page.getByText(revised,{exact:true}).waitFor({timeout:20000});
    console.log('LIVE_BROWSER_UPDATE_PASS');

    row=page.locator('.p-datatable-tbody tr').filter({hasText:revised});
    await row.getByRole('button',{name:'Delete'}).click();
    await page.getByText(revised,{exact:true}).waitFor({state:'hidden',timeout:20000});
    expect(dbDeleted(createdId)==='t','Delete did not persist soft-delete in PostgreSQL');
    const response = await fetch(apiBase+'/api/customers/'+createdId,{
      headers:{Authorization:observedToken},
    });
    expect(response.status===404,'Deleted row remains HTTP-visible: '+response.status);
    console.log('LIVE_BROWSER_DELETE_PASS');
    expect(!pageErrors.length, pageErrors.join('; '));
    const evidence = {
      verdict:'PASS',kind:'generated-react-api-postgresql-browser',
      model:'Business Operations Admin',dateUtc:new Date().toISOString(),
      scenarios:['login','read real customer table','create from React form',
        'verify created row directly in PostgreSQL','edit from React form',
        'delete from React table','verify soft-delete in PostgreSQL','GET deleted = 404'],
      apiResponses:statuses,
      screenshots:['business-admin-customers-live.png','business-admin-create-live.png','business-admin-edit-live.png'],
      limitations:'Disposable synthetic data, local Chromium, production infrastructure not evaluated',
    };
    fs.writeFileSync(path.join(__dirname,'CRUD-LIVE-EVIDENCE.json'),JSON.stringify(evidence,null,2)+'\n');
    console.log('LIVE_BROWSER_CRUD_PASS', statuses.length, 'real HTTP interactions');
  } finally {
    await context?.close();
    await browser.close();
    await staticServer.close();
  }
}
main().catch(error=>{console.error('BROWSER_ACCEPTANCE_FAIL',error.message);process.exitCode=1});
