const puppeteer = require('puppeteer');
const path = require('path')
const fs = require('fs');
const url = require('url');
const request = require('request');
//use node path to create an absolute path to the CERA_downloads dir
const downloadDestination = path.resolve('./CERA_Downloads');

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

    function alertDone(message) {
        if (message) {
            return console.log(message);
            

        } else {
            return console.log("hmmmm");
        }
    }
    
    // us node FS to define a file path and name and create a write stream and request 
    // send the request to the CERA download url
    const downloadShapefile = (url, dest) => {

        const file = fs.createWriteStream(dest + '/CERA.zip');
        const downloadRequest = request.get(url);
    
        // send request, and on response if code is 200 pipe the file
        // else log server error
        downloadRequest.on('response', (response) => {
            if (response.statusCode === 200) {
                console.log("beginning download, this may take up to a minute...");
                downloadRequest.pipe(file);
            } else {
                console.log('resonse status: ' + response.statusCode);
            }    
        });

        // check for request errors.  If error, unlink the file download (delete the file/request)
        // and log errors
        downloadRequest.on('error', (err) => {
            fs.unlink(dest, (err) => {
                console.log("unlink err: ", err);
            });
            console.log("req error: ", err.message);
        });
    
        // once file is done downloading, log sucess message.  What to do about error handling?
        file.on('finish', () => file.close(() => {
            console.log("download sucessful, file downloaded to ", path.dirname(file));
        }));

        // check for errors with file/create write stream  If error, unlink the file 
        // (delete the file/request)
        file.on('error', (err) => { 
            fs.unlink(dest, (err) => {
                console.log("unlink err: ", err);
            }); 
            console.log("file error: ", err.message);
        }); 

    
    };

    // set up intercept request listener, get download url and call download function 
    function handleRequest(interceptedRequest) {
        if (interceptedRequest.url().includes("download")) {
            const shapefileDownloadLink = encodeURI(interceptedRequest.url());

            console.log('A download request was made:', shapefileDownloadLink);

            downloadShapefile(shapefileDownloadLink, downloadDestination);
        } else {
            console.log('A request was made:', interceptedRequest.url());
        }
    }

    // when page initiates a request, run handleRequest
    page.on('request', handleRequest);

    // wait for button save button to appear (means save modal has rendered)
    // then click
    // download will start and file will save to default location (usually downloads director)
    // TODO: where do we want files to save?
    await page.waitFor('#btnSave');
    await page.click('#btnSave');    

    // remove listener after download save button is clicked, it's no longer needed
    page.removeListener('request', handleRequest);

    await page.waitFor(5000);


    // TODO: uncomment this once everything is working to close browser session
    await browser.close();

})();