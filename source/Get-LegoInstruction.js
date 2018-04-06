'use strict';

const puppeteer = require('puppeteer');
const { URL } = require('url');
const legacyURL = require('url');
const path = require('path');
const fs = require('fs');

const legoSiteResource = {
    url: 'https://www.lego.com/en-us/service/buildinginstructions',
    buildingInstructions: {
        formItems: {
            themeData: {
                selector: "body > div:nth-child(6) > div > div > div:nth-child(1) > div:nth-child(2) > div"
            },
            getSearchUrl: function (dataIndex, themeId) {
                return `https://www.lego.com//service/biservice/searchbytheme?fromIndex=${dataIndex}&onlyAlternatives=false&theme=${themeId}`;
            }
        }
    }
}

const dataValidation = {
    productTheme: new RegExp("^[^\\s][\\w &\\-']+[^\\s]?$", "g"),
    productId: new RegExp("^[^\\s]\\d+[^\\s]$", "g"),
    productTitle: new RegExp("^[^\\s][\\w '\\-\\d]+[^\\s]$", "g"),
    productYear: new RegExp("^(?:19[0-9]{2}|2[0-9]{3})$", "g"),
    instructionFilename: new RegExp("^[^\\s][\\d\\w_\\- ]+[^\\s]\\.(?:pdf|jpg)[^\\s]?$", "g"),
    instructionDescription: new RegExp("^[^\\s][\\w \\d\\']+[^\\s]?$", "g")
};

const dataReplace = {
    globalReplace: [
        {
            regEx: new RegExp("(%20|[/\"”“)(#™:®+\\\\,–!•?\\[\\]¿@*~$&^%=;{}|<>‘’¨])+", "g"),
            value: " "
        },
        {
            regEx: new RegExp("\\sTM\\s?", "g"),
            value: " "
        },
        {
            regEx: new RegExp("\\s\\s+", "g"),
            value: " "
        },
        {
            regEx: new RegExp("[éè]+", "g"),
            value: "e"
        },
        {
            regEx: new RegExp("Æ+", "g"),
            value: "A"
        },
        {
            regEx: new RegExp("Î+", "g"),
            value: "i"
        },
        {
            regEx: new RegExp("É+", "g"),
            value: "E"
        }
    ],
    productTitleReplace: [
        {
            regEx: new RegExp("\\.", "g"),
            value: " "
        }
    ],
    instructionDescriptionReplace: [
        {
            regEx: new RegExp("[\\.-]", "g"),
            value: " "
        }
    ]
};

const dataNormalize = {
    globalNormalize: [
        {
            regEx: new RegExp("['´`]+", "g"),
            value: "'"
        },
        {
            regEx: new RegExp("\\s\\s+", "g"),
            value: " "
        }
    ]
};

const isDesiredInstructionRegEx = {
    v39: [
        {
            regEx: new RegExp("(?:(?:^|\\W| |\\d)[vV] ?39(?:\\D|$))|(?: 39(?:(?:[ \\w])|$))|(?:\\wV39)", "g")
        },
        {
            regEx: new RegExp("[\\W ][nNaA][aAmM]39(?:[\\W]|$)", "g")
        },
        {
            regEx: new RegExp(" US(?:(?: )|$)", "g")
        },
        {
            regEx: new RegExp("(?:^|\\W| |\\d)[nNaA][aAmM](?:(?: )|(?:\\W)|(?:\\d)|(?:$))", "g")
        }
    ]
};

const isDesiredInstructionExceptionRegEx = {
    getProductId: function (productId) {
        return new RegExp(`(?:(?:^)|(?: )|(?:\\w))(${productId})(?:(?:\\D)|(?:$))`);
    }
};

const isNotDesiredInstructionRegEx = {
    v29: [
        {
            regEx: new RegExp("(?:(?:^|\\W| |\\d)[vV] ?29(?:\\D|$))|(?: 29(?:(?:[ \\w])|$))|(?:\\wV29)", "g")
        },
        {
            regEx: new RegExp("[\\W ][iI][nN]29(?:[\\W]|$)", "g")
        },
        {
            regEx: new RegExp("(?:^|\\W| |\\d)[iI][nN](?:(?: )|(?:\\W)|(?:\\d)|(?:$))", "g")
        }
    ]
};

class dataPurification {
    static purifyProductTheme(productTheme) {
        if (dataPurification.isProductThemeValid(productTheme)) {
            return productTheme;
        }

        productTheme = dataPurification.clean(productTheme);

        if (dataPurification.isProductThemeValid(productTheme)) {
            return productTheme;
        }

        throw `[purification failed]:[productTheme] [${productTheme}]`;
    }

    static purifyProductId(productId) {
        if (dataPurification.isProductIdValid(productId)) {
            return productId;
        }

        productId = dataPurification.clean(productId);

        if (dataPurification.isProductIdValid(productId)) {
            return productId;
        }

        throw `[purification failed]:[productId] [${productId}]`;
    }

    static purifyProductYear(productYear) {
        if (dataPurification.isProductYearValid(productYear)) {
            return productYear;
        }

        productYear = dataPurification.clean(productYear);

        if (dataPurification.isProductYearValid(productYear)) {
            return productYear;
        }

        throw `[purification failed]:[productYear] [${productYear}]`;
    }

    static purifyProductTitle(productTitle) {
        if (dataPurification.isProductTitleValid(productTitle)) {
            return productTitle;
        }

        productTitle = dataPurification.cleanProuctTitle(productTitle);
        productTitle = dataPurification.clean(productTitle);

        if (dataPurification.isProductTitleValid(productTitle)) {
            return productTitle;
        }

        throw `[purification failed]:[productTitle] [${productTitle}]`;
    }

    static purifyInstructionFilename(instructionFilename) {
        if (dataPurification.isInstructionFilenameValid(instructionFilename)) {
            return instructionFilename;
        }

        instructionFilename = dataPurification.clean(instructionFilename);

        if (dataPurification.isInstructionFilenameValid(instructionFilename)) {
            return instructionFilename;
        }

        throw `[purification failed]:[instructionFilename] [${instructionFilename}]`;
    }

    static purifyInstructionDescription(instructionDescription) {
        if (dataPurification.isInstructionDescriptionValid(instructionDescription)) {
            return instructionDescription;
        }

        instructionDescription = dataPurification.cleanInstructionDescription(instructionDescription);
        instructionDescription = dataPurification.clean(instructionDescription);

        if (dataPurification.isInstructionDescriptionValid(instructionDescription)) {
            return instructionDescription;
        }

        throw `[purification failed]:[instructionDescription] [${instructionDescription}]`;
    }
    static clean(value) {
        for (let i = 0; i < dataNormalize.globalNormalize.length; i++) {
            value = value.replace(dataNormalize.globalNormalize[i].regEx, dataNormalize.globalNormalize[i].value);
        }

        for (let i = 0; i < dataReplace.globalReplace.length; i++) {
            value = value.replace(dataReplace.globalReplace[i].regEx, dataReplace.globalReplace[i].value);
        }
        return value.trim();
    }

    static cleanProuctTitle(value) {
        for (let i = 0; i < dataReplace.productTitleReplace.length; i++) {
            value = value.replace(dataReplace.productTitleReplace[i].regEx, dataReplace.productTitleReplace[i].value);
        }
        return value;
    }

    static cleanInstructionDescription(value) {
        for (let i = 0; i < dataReplace.instructionDescriptionReplace.length; i++) {
            value = value.replace(dataReplace.instructionDescriptionReplace[i].regEx, dataReplace.instructionDescriptionReplace[i].value);
        }
        return value;
    }

    static isProductThemeValid(productTheme) {
        return dataValidation.productTheme.test(productTheme);
    }

    static isProductIdValid(productId) {
        return dataValidation.productId.test(productId);
    }

    static isProductYearValid(productYear) {
        return dataValidation.productYear.test(productYear);
    }

    static isProductTitleValid(productTitle) {
        return dataValidation.productTitle.test(productTitle);
    }

    static isInstructionFilenameValid(instructionFilename) {
        return dataValidation.instructionFilename.test(instructionFilename);
    }

    static isInstructionDescriptionValid(instructionDescription) {
        return dataValidation.instructionDescription.test(instructionDescription);
    }
}

(async () => {

    const rawArgs = process.argv.slice(2);
    const LegoInstructionRepositoryDirectory = rawArgs[0];
    const browser = await puppeteer.launch({ headless: true });

    try {
        const page = await browser.newPage();
        await page.goto(legoSiteResource.url);

        const legoProducts = [];

        const themeSearchData = await getThemeSearchData(page);

        for (var i = 0; i < themeSearchData.length; i++) {
            let hasMoreData = true;
            let dataIndex = 0;
            while (hasMoreData) {
                let searchUrl = legoSiteResource.buildingInstructions.formItems.getSearchUrl(dataIndex, themeSearchData[i].Key);
                let searchResponse = await page.goto(searchUrl);

                try {
                    let instructionsData = await searchResponse.json();
                    hasMoreData = instructionsData.moreData;
                    dataIndex += instructionsData.count;
                    const legoInstructionRepsitoryPath = path.resolve(path.normalize(LegoInstructionRepositoryDirectory));
                    ensureDirectory(legoInstructionRepsitoryPath);
                    let productSet = await processProducts(instructionsData.products, legoInstructionRepsitoryPath);
                    for (var p = 0; p < productSet.length; p++) {
                        legoProducts.push(productSet[p]);
                    }
                }
                finally {
                    await searchResponse.close;
                }
            }
        }

        const legoProductsJsonString = JSON.stringify(legoProducts);
        console.log(legoProductsJsonString);
    }
    finally {
        await browser.close();
    }
})();

async function getThemeSearchData(page) {
    const selectedItem = await page.evaluate(selector => {
        let item = document.querySelector(selector);
        return item.getAttribute("data-search-themes");
    }, legoSiteResource.buildingInstructions.formItems.themeData.selector);
    return JSON.parse(selectedItem);
}

async function processProducts(products, legoInstructionRepsitoryPath) {
    const productSet = new Array(products.length);

    for (var i = 0; i < products.length; i++) {
        process.stderr.write(".");
        productSet[i] = await processProduct(products[i], legoInstructionRepsitoryPath);
    }
    return productSet;
}

async function processProduct(product, legoInstructionRepsitoryPath) {
    const productId = dataPurification.purifyProductId(product.productId);
    const productTitle = dataPurification.purifyProductTitle(product.productName);
    const productTheme = dataPurification.purifyProductTheme(product.themeName);
    const productYear = dataPurification.purifyProductYear(product.launchYear.toString());

    // compute directory
    const productDirectoryName = `${productId} - ${productTitle}`;
    const productThemeDirectoryPath = path.resolve(legoInstructionRepsitoryPath, productTheme);
    ensureDirectory(productThemeDirectoryPath);
    const productYearDirectoryPath = path.resolve(productThemeDirectoryPath, productYear);
    ensureDirectory(productYearDirectoryPath);
    const productDirectoryPath = path.resolve(productYearDirectoryPath, productDirectoryName);
    ensureDirectory(productDirectoryPath);
    const buildingInstructions = product.buildingInstructions;

    const productInfo = {
        theme: productTheme,
        year: productYear,
        id: productId,
        title: productTitle,
        instructions: []
    }

    let hasInstruction = false;
    for (var i = 0; i < buildingInstructions.length; i++) {
        let instruction = {
            description: "",
            fileInfo: null,
            matchResult: null,
        };
        productInfo.instructions.push(instruction);
        let buildingInstructionDescription = dataPurification.purifyInstructionDescription(buildingInstructions[i].description);
        instruction.description = buildingInstructionDescription;
        let matchResult = matchInstruction(buildingInstructionDescription, productId);
        instruction.matchResult = matchResult;
        if (!matchResult.isDesired) {
            continue;
        }
        instruction.fileInfo = await getInstruction(buildingInstructions[i].pdfLocation, productId, productDirectoryPath);
    }

    return productInfo;
}

async function getInstruction(instructionPdfLocation, productId, productInstructionPath) {
    const instructionUrl = new URL(instructionPdfLocation);
    const instructionUrlPathname = instructionUrl.pathname;
    const pdfPathIndex = instructionUrlPathname.lastIndexOf("/");
    const instructionFilenameCandidate = `${productId}-${instructionUrlPathname.substring(pdfPathIndex + 1)}`; // +1 to skip the inclusion of /

    const instructionFilename = dataPurification.purifyInstructionFilename(instructionFilenameCandidate);
    const instructionTempFilename = "~" + instructionFilename;

    const instructionFilePath = path.resolve(productInstructionPath, instructionFilename);
    const instructionTempFilePath = path.resolve(productInstructionPath, instructionTempFilename);

    const instructionFileInfo = {
        filePath: instructionFilePath,
        isNew: false,
    };
    if (!fs.existsSync(instructionFilePath)) {
        await downloadInstruction(instructionPdfLocation, instructionTempFilePath, instructionFilePath);
        instructionFileInfo.isNew = true;
    }
    return instructionFileInfo;
}

function matchInstruction(instructionDescription, productId) {
    let hasMatch = false;
    let isDesiredMatch = false;
    let matchRegEx = null;

    // desired match
    for (let i = 0; i < isDesiredInstructionRegEx.v39.length; i++) {
        const regExp = isDesiredInstructionRegEx.v39[i].regEx;
        regExp.lastIndex = 0;
        if (regExp.test(instructionDescription)) {
            isDesiredMatch = true;
            hasMatch = true;
            matchRegEx = regExp.toString();
            break;
        }
    }

    // not desired
    if (!hasMatch) {
        for (let i = 0; i < isNotDesiredInstructionRegEx.v29.length; i++) {
            const regExp = isNotDesiredInstructionRegEx.v29[i].regEx;
            regExp.lastIndex = 0;
            if (regExp.test(instructionDescription)) {
                hasMatch = true;
                matchRegEx = regExp.toString();
                break;
            }
        }
    }

    // exception desired match
    if (!hasMatch) {
        const regExp = isDesiredInstructionExceptionRegEx.getProductId(productId);
        regExp.lastIndex = 0;
        if (regExp.test(instructionDescription)) {
            isDesiredMatch = true;
            hasMatch = true;
            matchRegEx = regExp.toString();
        }
    }

    return {
        hasMatch: hasMatch, // instruction matched a regular expression
        isDesired: isDesiredMatch, // the instruction matched a regular expression flagging it as one to download
        regEx: matchRegEx, // the regular expression if has match 
    };
}

function ensureDirectory(directoryPath) {
    if (fs.existsSync(directoryPath)) { return; }
    fs.mkdirSync(directoryPath);
}

async function downloadInstruction(instructionUrl, instructionTempFilename, instructionFilePath) {
    await downloadFile(instructionUrl, instructionTempFilename, null);
    if (fs.existsSync(instructionTempFilename)) {
        fs.renameSync(instructionTempFilename, instructionFilePath);
    }
    else {
        throw `download failed for ${instructionUrl}`;
    }
}

/**
 * @param {string} url
 * @param {string} destinationPath
 * @param {?function(number, number)} progressCallback
 * @return {!Promise}
 */
function downloadFile(url, destinationPath, progressCallback) {
    let fulfill, reject;

    const promise = new Promise((x, y) => { fulfill = x; reject = y; });

    const request = httpRequest(url, 'GET', response => {
        if (response.statusCode !== 200) {
            const error = new Error(`Download failed: server returned code ${response.statusCode}. URL: ${url}`);
            // consume response data to free up memory
            response.resume();
            reject(error);
            return;
        }
        const file = fs.createWriteStream(destinationPath);
        file.on('finish', () => fulfill());
        file.on('error', error => reject(error));
        response.pipe(file);
        const totalBytes = parseInt(/** @type {string} */(response.headers['content-length']), 10);
        if (progressCallback)
            response.on('data', onData.bind(null, totalBytes));
    });
    request.on('error', error => reject(error));
    return promise;

    function onData(totalBytes, chunk) {
        progressCallback(totalBytes, chunk.length);
    }
}

function httpRequest(url, method, response) {
    /** @type {Object} */
    const options = legacyURL.parse(url);
    options.method = method;

    const driver = options.protocol === 'https:' ? 'https' : 'http';
    const request = require(driver).request(options, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            httpRequest(res.headers.location, method, response);
        }
        else {
            response(res);
        }
    });
    request.end();
    return request;
}