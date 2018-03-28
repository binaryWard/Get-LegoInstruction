Enable Lego fans to archive Lego instructions.

The Get-LegoInstruction will access Lego.com and download all available North American format instructions.
The Get-LegoInstruction uses Google Puppeteer 

Requirements
* Node.js https://nodejs.org
* Puppeteer https://github.com/GoogleChrome/puppeteer


Get-LegoInstruction will download all instructions into a directorry.  It will skip files it has already downnloaded.
The directory structure is \[theme]\[year]\[id]-[name]

Get-LogoInstruction will output to the console information about the instructions it has found.


To access the instructions and share with the family.
* Open the instruction .pdf file directly
* Setup a web server to share the files with the family
* Setup a network share.


A quick web server is to use a node.js web server live-server.  The web server allows mobile devices to easily access the instructions.  I have found the built in .pdf viewer in Microsoft OneDrive App to be an excellent viewer. It is possible to use the OneDrive App on a Childrens Amazon Fire to access and view the instructions.  The OneDrive does not need to be setup with an account.


To execute the directory path must be provided.  

Example
node .\Get-LegoInstructions.js "c:\Lego\"


Expect a full download to be 60+ Gigabytes.