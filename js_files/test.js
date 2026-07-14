const generateQRCode = (container, text) => { // new value w/ parameter
    return new Promise((resolve, reject) => { //new promise, resolve for value, reject for error catch
        new QRCode(container, { //generate qr code initially
            text: text, //text parameter is going to be userEmail
            width: 256, //height/width dimensions 
            height: 256,
        });
        
        let resolved = false; //boolean value? most likely for error catching and/or verification
        
        const observer = new MutationObserver(() => { //create our observer. name "observer" is optional, couldve been anything else, just more convenient. 
            //observer watches our html file for any changes in specific container. built in api
            if (resolved) return; //stop observing and return if done
            const img = container.querySelector('img'); // get our image
            if (img && img.src) { //verify if we have our image and image url
                resolved = true; //checks if we have resolved the promise (img url)
                observer.disconnect(); // quit observing,  stop watching for changes
                resolve(img.src); //return our img.src value to add to currentUser.qrCode
            }
        });
        
        observer.observe(container, { childList: true, subtree: true });
        
        // Timeout with error handling
        setTimeout(() => {
            if (!resolved) {
                observer.disconnect();
                const img = container.querySelector('img');
                if (img && img.src) {
                    resolve(img.src);
                } else {
                    reject(new Error('QR code generation timeout'));
                }
            }
        }, 1000);
    });
};

// Usage with error handling:
generateQRCode(qrContainer, userEmail)
    .then(qrDataUrl => {
        currentUser.qrCode = qrDataUrl;
        localStorage.setItem('userinfo', JSON.stringify(userInfo));
    })
    .catch(error => {
        console.error('Failed to generate QR code:', error);
    });