const puppeteer = require('puppeteer');

(async () => {

    // TODO: change headless to true once confirmed everything works.
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // open blank page and navigate to CERA login URL
    // TODO: need to add geolocation spoof - runs OK locally (and probably would be fine from Raleigh server)
    // but better to be sure
    await page.goto('https://cera.coastalrisk.live/cerarisk/accounts/login', {waitUntil: 'networkidle2'});
    
    // complete username and password form, click login button
    // note: use eval instead of 'type' so text is entered as single string rather than
    // char by char, and also to ensure that form is submitted even if there is a modal/popup
    await page.waitFor('input[name=username]');
    await page.$eval('input[name=username]', el => el.value = 'lduggan@espassociates.com');

    await page.waitFor('input[name=password]');
    await page.$eval('input[name=password]', el => el.value = 'esp123');

    await page.click('.btn_login');


    // after login, page redirects automatically
    // wait for disclaimer modal to pop up 
    // waitForXPath monitors the page for a timeout period, by default is 30 sec, and
    // will throw an error if doesn't find specified element w/in that timeout
    // TODO: how would we want to handle this error?  Just log it, or send a notification? Retry?
    await page.waitForXPath("//span[contains(text(), 'Accept')]");
    const [acceptBtn] = await page.$x("//span[contains(text(), 'Accept')]");

    // and click accept button once it is on the page  
    await acceptBtn.click();
   
    // wait 3 seconds to give the download modal time to dismiss, then click the 
    // download link (has id of btnDwnl)
    await page.waitFor(3000);
    await page.click('#btnDwnl');

    // wait for shapefile points link (means download modal has rendered)
    // then click
    await page.waitFor('#ShpPoints');
    await page.click('#ShpPoints');

    // wait for button save button to appear (means save modal has rendered)
    // then click
    // download will start and file will save to default location (usually downloads director)
    // TODO: where do we want files to save?
    await page.waitFor('#btnSave');
    await page.click('#btnSave');


    // TODO: uncomment this once everything is working to close browser session
    // await browser.close();

})();