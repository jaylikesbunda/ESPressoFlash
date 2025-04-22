document.addEventListener('DOMContentLoaded', () => {
    // Initialize the loading animation
    const loadingAnimation = window.initLoadingAnimation ? window.initLoadingAnimation() : null;
    
    // Record the start time of the loading animation
    const loadingStartTime = Date.now();
    // Minimum display time in milliseconds (3 seconds)
    const minDisplayTime = 3000;

    // Wait for esptoolJS to be available
    const checkEsptoolLoaded = () => {
        if (window.esptoolJS) {
            // Calculate how long the loading animation has been visible
            const currentTime = Date.now();
            const elapsedTime = currentTime - loadingStartTime;
            
            // If the animation hasn't been visible for the minimum time, delay cleanup
            if (elapsedTime < minDisplayTime) {
                setTimeout(() => {
                    if (loadingAnimation) {
                        loadingAnimation.cleanup();
                    }
                    initializeFlasher();
                }, minDisplayTime - elapsedTime);
            } else {
                // The animation has been visible long enough, clean up now
                if (loadingAnimation) {
                    loadingAnimation.cleanup();
                }
                initializeFlasher();
            }
        } else {
            setTimeout(checkEsptoolLoaded, 100);
        }
    };
    
    checkEsptoolLoaded();
    
    // Initialize the flasher once esptoolJS is loaded
    function initializeFlasher() {
        // Helper function to safely get elements
        function getElementById(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`!!! Element with ID '${id}' not found in the DOM !!!`);
            }
            return element;
        }
        
        // DOM elements - Steps
        const stepContainers = document.querySelectorAll('.step-container');
        const stepCircles = document.querySelectorAll('.stepper-circle');
        
        // Navigation buttons
        const nextToStep2Button = getElementById('nextToStep2');
        const backToStep1Button = getElementById('backToStep1');
        const nextToStep3Button = getElementById('nextToStep3');
        const backToStep2Button = getElementById('backToStep2');
        const nextToStep4Button = getElementById('nextToStep4');
        const backToStep3Button = getElementById('backToStep3');
        const startOverButton = getElementById('startOver');
        
        // Action buttons
        const connectButton = getElementById('connectButton');
        const disconnectButton = getElementById('disconnectButton');
        const flashButton = getElementById('flashButton');
        const eraseButton = getElementById('eraseButton');
        const resetButton = getElementById('resetButton');
        
        // Status and display elements
        const terminalElem = getElementById('terminal');
        const terminalContainer = getElementById('terminal-container');
        const chipInfoElem = getElementById('chipInfo');
        const flashProgressElem = getElementById('flashProgress');
        const flashSummaryElem = getElementById('flashSummary');
        const flashETAElem = getElementById('flashETA'); // Get the ETA element
        const selectedDeviceConnectElem = getElementById('selectedDeviceConnect');
        const globalStatusIndicator = getElementById('globalStatusIndicator');
        
        // Binary type toggle buttons
        const binaryTypeButtons = document.querySelectorAll('.binary-type-toggle .btn');
        
        // Firmware file sections
        const appFirmwareSection = getElementById('appFirmware');
        const bootloaderFirmwareSection = getElementById('bootloaderFirmware');
        const partitionFirmwareSection = getElementById('partitionFirmware');
        
        // Flash settings elements
        const baudrateSelect = getElementById('baudrate');
        const flashModeSelect = getElementById('flashMode');
        const flashFreqSelect = getElementById('flashFreq');
        const flashSizeSelect = getElementById('flashSize');
        const resetMethodSelect = getElementById('resetMethod');
        const eraseAllCheckbox = getElementById('eraseAll');
        
        // File input elements
        const appFileInput = getElementById('appFile');
        const bootloaderFileInput = getElementById('bootloaderFile');
        const partitionFileInput = getElementById('partitionFile');
        const appFileInfoElem = getElementById('appFileInfo');
        const bootloaderFileInfoElem = getElementById('bootloaderFileInfo');
        const partitionFileInfoElem = getElementById('partitionFileInfo');
        
        // Set initial "No file selected" text
        if (appFileInfoElem) appFileInfoElem.textContent = 'No file selected';
        if (bootloaderFileInfoElem) bootloaderFileInfoElem.textContent = 'No file selected';
        if (partitionFileInfoElem) partitionFileInfoElem.textContent = 'No file selected';
        
        // Address input elements
        const appAddressInput = getElementById('appAddress');
        const bootloaderAddressInput = getElementById('bootloaderAddress');
        const partitionAddressInput = getElementById('partitionAddress');
        
        // Get the new elements
        const showMoreDevicesButton = getElementById('showMoreDevicesButton');
        const showLessDevicesButton = getElementById('showLessDevicesButton');
        const rareDevicesContainer = getElementById('rareDevicesContainer');
        const firmwareSourceSelect = getElementById('firmwareSourceSelect');
        const ghostEspDownloadSection = getElementById('ghostEspDownloadSection');
        const manualUploadSection = getElementById('manualUploadSection');
        const repoSelect = getElementById('repoSelect');
        const downloadFirmwareLink = getElementById('downloadFirmwareLink');
        
        // Global variables
        let espLoader = null;
        let transport = null;
        let connected = false;
        let chipType = '';
        let selectedDevice = null;
        let selectedSide = '';
        let currentStep = 1;
        
        // Terminal output handler
        let espLoaderTerminal = {
            clean() {
                if (terminalElem) {
                    terminalElem.innerHTML = '';
                }
            },
            writeLine(data) {
                if (terminalElem) {
                    terminalElem.innerHTML += data + '\n';
                    terminalElem.scrollTop = terminalElem.scrollHeight;
                }
                // Update status indicator with latest message
                updateStatusIndicator('flashing', 'Processing', data);
                // Also log to console for debugging
                console.log(data);
            },
            write(data) {
                if (terminalElem) {
                    terminalElem.innerHTML += data;
                    terminalElem.scrollTop = terminalElem.scrollHeight;
                }
                // Also log to console for debugging
                console.log(data);
            }
        };
        
        // Device options (filters, flash defaults, etc.)
        const deviceOptions = {
            'ESP32': {
                filters: [
                    { usbVendorId: 0x0403, usbProductId: 0x6010 }, // FTDI (FT2232)
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x1A86, usbProductId: 0x7523 }, // CH340
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '40m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x1000',
                partitionAddress: '0x8000'
            },
            'ESP32-S2': {
                filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x0002 }, // Built-in
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added for boards with external UART
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added for boards with external UART
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '80m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x1000',
                partitionAddress: '0x8000'
            },
            'ESP32-S3': {
                filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x1001 }, // Built-in
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added for boards with external UART
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added for boards with external UART
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '80m',
                defaultFlashSize: '8MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x0',
                partitionAddress: '0x8000'
            },
            'ESP32-C3': {
                filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x0005 }, // Built-in
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added for boards with external UART
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added for boards with external UART
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '40m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x0',
                partitionAddress: '0x8000'
            },
            'ESP32-C6': {
                filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x1001 }, // Similar to S3
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added for boards with external UART
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added for boards with external UART
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '80m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x0',
                partitionAddress: '0x8000'
            },
            'ESP32-C5': {
                filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x1001 }, // Guessing based on S3/C6
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '80m', // Assuming similar to C6
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x2000',   // Updated based on user info
                partitionAddress: '0x8000'
            },
            'ESP32-H2': {
                 filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x1001 }, // Guessing based on S3/C6/C5
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',  // Common default
                defaultFlashFreq: '40m', // Common default
                defaultFlashSize: '4MB', // Common default
                appAddress: '0x10000',
                bootloaderAddress: '0x0',    // User provided offset
                partitionAddress: '0x8000'
            },
            'ESP8266': {
                filters: [
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x1A86, usbProductId: 0x7523 }, // CH340
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '40m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x0',
                partitionAddress: '0x8000'
            },
            'ESP32-C2': {
                filters: [
                     { usbVendorId: 0x303A, usbProductId: 0x0005 }, // Guessing based on C3
                     { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                     { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                     { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                     { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '40m',
                defaultFlashSize: '4MB',
                appAddress: '0x10000',
                bootloaderAddress: '0x0',   // Inferring 0x0 like other C-series
                partitionAddress: '0x8000'
            },
            'ESP32-P4': {
                 filters: [
                    { usbVendorId: 0x303A, usbProductId: 0x1001 }, // Placeholder/Guess (Likely built-in)
                    { usbVendorId: 0x10C4, usbProductId: 0xEA60 }, // CP210x
                    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI (FT232R) - Added
                    { usbVendorId: 0x303A, usbProductId: 0x1011 }, // CH9102 (Espressif VID) - Added
                    { usbVendorId: 0x1A86, usbProductId: 0x55D4 }  // CH9102 (WCH VID) - Added
                ],
                defaultFlashMode: 'dio',
                defaultFlashFreq: '80m', // High speed chip, assuming faster freq
                defaultFlashSize: '4MB', // Default
                appAddress: '0x10000',
                bootloaderAddress: '0x2000', // User provided offset
                partitionAddress: '0x8000'
            }
        };

        // Step navigation event listeners
        nextToStep2Button.addEventListener('click', () => {
            if (selectedDevice) {
                goToStep(2);
                selectedDeviceConnectElem.textContent = selectedSide;
            } else {
                espLoaderTerminal.writeLine("Please select a side first");
            }
        });
        
        backToStep1Button.addEventListener('click', () => goToStep(1));
        
        nextToStep3Button.addEventListener('click', () => {
            if (connected) {
                goToStep(3);
            } else {
                espLoaderTerminal.writeLine("Please connect to a device first");
            }
        });
        
        backToStep2Button.addEventListener('click', () => goToStep(2));
        
        nextToStep4Button.addEventListener('click', () => {
            updateFlashSummary();
            goToStep(4);
        });
        
        backToStep3Button.addEventListener('click', () => goToStep(3));
        
        startOverButton.addEventListener('click', () => {
            if (connected) {
                disconnect().then(() => goToStep(1));
            } else {
                goToStep(1);
            }
        });
        
        // Binary type toggle listeners
        if (binaryTypeButtons && binaryTypeButtons.length > 0) {
            binaryTypeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Deactivate all buttons and hide all sections
                    binaryTypeButtons.forEach(btn => btn.classList.remove('active'));
                    
                    // Hide all firmware sections
                    if (appFirmwareSection) appFirmwareSection.classList.add('d-none');
                    if (bootloaderFirmwareSection) bootloaderFirmwareSection.classList.add('d-none');
                    if (partitionFirmwareSection) partitionFirmwareSection.classList.add('d-none');
                    
                    // Activate clicked button and show corresponding section
                    button.classList.add('active');
                    const binaryType = button.dataset.binary;
                    
                    if (binaryType === 'app' && appFirmwareSection) {
                        appFirmwareSection.classList.remove('d-none');
                    } else if (binaryType === 'bootloader' && bootloaderFirmwareSection) {
                        bootloaderFirmwareSection.classList.remove('d-none');
                    } else if (binaryType === 'partition' && partitionFirmwareSection) {
                        partitionFirmwareSection.classList.remove('d-none');
                    }
                });
            });
        }
        
        // Device selection event listeners
        const deviceCards = document.querySelectorAll('.device-card'); // This now includes hidden cards too
        deviceCards.forEach(card => {
            card.addEventListener('click', () => {
                deviceCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedDevice = card.dataset.device;
                selectedSide = card.querySelector('.device-name').textContent;
                espLoaderTerminal.writeLine(`Selected: ${selectedSide} (${selectedDevice})`);
                updateDefaultAddresses();
                // Enable Step 1 next button
                if (nextToStep2Button) nextToStep2Button.disabled = false;
            });
        });
        
        // Show More/Less Devices Button Listeners
        if (showMoreDevicesButton && rareDevicesContainer && showLessDevicesButton) {
            showMoreDevicesButton.addEventListener('click', () => {
                rareDevicesContainer.classList.remove('d-none'); // Show the hidden container
                showMoreDevicesButton.classList.add('d-none');   // Hide the 'Show More' button
                showLessDevicesButton.classList.remove('d-none'); // Show the 'Show Less' button
            });

            showLessDevicesButton.addEventListener('click', () => {
                rareDevicesContainer.classList.add('d-none');    // Hide the hidden container
                showLessDevicesButton.classList.add('d-none');    // Hide the 'Show Less' button
                showMoreDevicesButton.classList.remove('d-none'); // Show the 'Show More' button
            });
        }
        
        // Main action event listeners
        connectButton.addEventListener('click', connect);
        disconnectButton.addEventListener('click', disconnect);
        flashButton.addEventListener('click', flash);
        eraseButton.addEventListener('click', eraseFlash);
        resetButton.addEventListener('click', resetDevice);
        
        // Add this function to handle drag and drop events AND file input changes
        if (appFirmwareSection) {
            const appDropZone = appFirmwareSection.querySelector('.custom-file-upload');
            setupFileInputHandling(appDropZone, appFileInput, appFileInfoElem);
        }

        if (bootloaderFirmwareSection) {
            const bootloaderDropZone = bootloaderFirmwareSection.querySelector('.custom-file-upload');
            setupFileInputHandling(bootloaderDropZone, bootloaderFileInput, bootloaderFileInfoElem);
        }

        if (partitionFirmwareSection) {
            const partitionDropZone = partitionFirmwareSection.querySelector('.custom-file-upload');
            setupFileInputHandling(partitionDropZone, partitionFileInput, partitionFileInfoElem);
        }
        
        // RENAME setupDragAndDrop to setupFileInputHandling and modify it
        function setupFileInputHandling(dropZone, fileInput, infoElement) {
            if (!dropZone || !fileInput || !infoElement) {
                console.error("Missing elements:", fileInput?.id);
                return;
            }
            
            // Direct file input event listener
            fileInput.onchange = function() {
                console.log("DIRECT onchange triggered for", fileInput.id);
                
                if (this.files && this.files.length > 0) {
                    const file = this.files[0];
                    const fileSizeKB = Math.round(file.size / 1024);
                    
                    // Update display immediately
                    infoElement.textContent = `${file.name} (${fileSizeKB} KB)`;
                    
                    // Update label
                    const uploadLabel = dropZone.querySelector('span');
                    if (uploadLabel) {
                        uploadLabel.innerHTML = `<i class="bi bi-file-earmark-check"></i> ${file.name}`;
                    }
                    
                    // Add styling
                    dropZone.classList.add('file-uploaded');
                    
                    // Debug info
                    console.log({
                        inputId: fileInput.id,
                        fileName: file.name,
                        fileSize: fileSizeKB,
                        element: infoElement,
                        text: infoElement.textContent
                    });
                }
            };
            
            // Click handler for the dropzone - use simpler approach
            dropZone.onclick = function(e) {
                e.stopPropagation();
            };
            
            // Add a global debug helper with direct DOM reference
            window[fileInput.id + '_debug'] = function() {
                console.log("DEBUG:", fileInput.id, {
                    hasFiles: fileInput.files && fileInput.files.length > 0,
                    fileName: fileInput.files?.[0]?.name,
                    infoText: infoElement.textContent,
                    dropZoneClasses: dropZone.className
                });
                
                // Force update attempt
                if (fileInput.files && fileInput.files.length > 0) {
                    infoElement.textContent = fileInput.files[0].name;
                    dropZone.classList.add('file-uploaded');
                    console.log("Forced update applied");
                }
            };
            
            console.log("Setup COMPLETE for", fileInput.id);
        }
        
        // Helper function to navigate between steps
        function goToStep(step) {
            // Hide all steps and deactivate all circles
            stepContainers.forEach(container => container.classList.remove('active'));
            stepCircles.forEach(circle => {
                circle.classList.remove('active');
                circle.classList.remove('completed');
            });
            
            // Show the target step
            const targetStepContainer = document.getElementById(`step${step}`);
            if (targetStepContainer) {
                targetStepContainer.classList.add('active');
            }
            
            // Update stepper circles
            for (let i = 0; i < stepCircles.length; i++) {
                if (i + 1 < step) {
                    stepCircles[i].classList.add('completed');
                } else if (i + 1 === step) {
                    stepCircles[i].classList.add('active');
                }
            }
            
            currentStep = step;
            // Re-evaluate button states when changing steps
            updateButtonStates();
        }
        
        // Update default addresses based on selected device
        function updateDefaultAddresses() {
            if (selectedDevice && deviceOptions[selectedDevice]) {
                const options = deviceOptions[selectedDevice];
                
                // Set default flash parameters
                flashModeSelect.value = options.defaultFlashMode;
                flashFreqSelect.value = options.defaultFlashFreq;
                flashSizeSelect.value = options.defaultFlashSize;
                
                // Set default addresses
                if (appAddressInput) appAddressInput.value = options.appAddress;
                if (bootloaderAddressInput) bootloaderAddressInput.value = options.bootloaderAddress;
                if (partitionAddressInput) partitionAddressInput.value = options.partitionAddress;
            }
        }
        
        // Update file info when file is selected
        function updateFileInfo(fileInput, infoElement) {
            if (fileInput.files && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileSizeKB = Math.round(file.size / 1024);
                infoElement.textContent = `${file.name} (${fileSizeKB} KB)`;
            } else {
                infoElement.textContent = 'No file selected';
            }
        }
        
        // Update flash summary before flashing
        function updateFlashSummary() {
            flashSummaryElem.innerHTML = ''; // Clear previous summary
            flashSummaryElem.classList.add('flash-summary-box'); // Add a class for styling
            
            let hasBinaries = false;
            
            // Helper to add summary items
            const addSummaryItem = (icon, text) => {
                flashSummaryElem.innerHTML += `<div class="summary-item"><i class="bi ${icon} me-2"></i> ${text}</div>`;
            };

            // Check application firmware
            if (appFileInput && appFileInput.files && appFileInput.files.length > 0) {
                const file = appFileInput.files[0];
                const address = appAddressInput.value;
                addSummaryItem('bi-file-earmark-binary', `Application: ${file.name} at ${address}`);
                hasBinaries = true;
            }
            
            // Check bootloader firmware
            if (bootloaderFileInput && bootloaderFileInput.files && bootloaderFileInput.files.length > 0) {
                const file = bootloaderFileInput.files[0];
                const address = bootloaderAddressInput.value;
                addSummaryItem('bi-hdd-network', `Bootloader: ${file.name} at ${address}`);
                hasBinaries = true;
            }
            
            // Check partition table
            if (partitionFileInput && partitionFileInput.files && partitionFileInput.files.length > 0) {
                const file = partitionFileInput.files[0];
                const address = partitionAddressInput.value;
                addSummaryItem('bi-table', `Partition Table: ${file.name} at ${address}`);
                hasBinaries = true;
            }
            
            if (!hasBinaries) {
                flashSummaryElem.innerHTML = '<div class="summary-item text-warning"><i class="bi bi-exclamation-triangle me-2"></i> No firmware files selected</div>';
                flashButton.disabled = true;
            } else {
                flashButton.disabled = false;
            }
            
            // Add flash settings
             addSummaryItem('bi-gear', `Settings: ${flashModeSelect.value.toUpperCase()}, ${flashFreqSelect.value}, ${flashSizeSelect.value}`);
            
            // Add erase flag
            if (eraseAllCheckbox.checked) {
                 addSummaryItem('bi-eraser-fill text-warning', '<strong>Erase all flash before programming</strong>');
            }
        }
        
        function hasFirmwareFilesSelected() {
            return (appFileInput && appFileInput.files && appFileInput.files.length > 0) ||
                (bootloaderFileInput && bootloaderFileInput.files && bootloaderFileInput.files.length > 0) ||
                (partitionFileInput && partitionFileInput.files && partitionFileInput.files.length > 0);
        }
        
        async function connect() {
            if (!selectedDevice) {
                espLoaderTerminal.writeLine("Please select a device type first");
                return;
            }

            // Disable connect button during connection attempt
             if (connectButton) connectButton.disabled = true;

            try {
                espLoaderTerminal.writeLine(`Requesting WebSerial port. Select your device from the popup...`);
                const serialOptions = {};
                // Add filters based on selected device if available
                if (selectedDevice && deviceOptions[selectedDevice] && deviceOptions[selectedDevice].filters) {
                    serialOptions.filters = deviceOptions[selectedDevice].filters;
                    espLoaderTerminal.writeLine(`Applying filters: ${JSON.stringify(serialOptions.filters)}`);
                } else {
                     espLoaderTerminal.writeLine(`No specific filters applied for ${selectedDevice || 'unknown device'}.`);
                }

                const device = await navigator.serial.requestPort(serialOptions);
                transport = new window.esptoolJS.Transport(device);

                espLoaderTerminal.writeLine("Connecting to device...");
                updateStatusIndicator('flashing', 'Connecting...', '');


                // Create loader
                const baudrate = parseInt(baudrateSelect.value);
                // Let's add enableTracing for more detailed logs if needed
                espLoader = new window.esptoolJS.ESPLoader({
                    transport: transport,
                    baudrate: baudrate,
                    terminal: espLoaderTerminal,
                    // --- CHANGE: Use main() which handles reset/sync ---
                    // The reset method dropdown is not directly used by main()
                    // main() uses its internal reset logic.
                    // We might need to revisit reset strategy if main() fails.
                    enableTracing: true // Add detailed tracing
                });


                // --- CHANGE: Use main() instead of connect() ---
                // main() handles the reset sequence based on chip type usually.
                // It combines connect, sync, and reading chip info.
                chipType = await espLoader.main(); // Returns chip name string
                espLoaderTerminal.writeLine(`Connected to ${selectedSide} (${chipType})`);
                // --- End Change ---

                let chipInfoText = `<span class="status-indicator status-connected"></span> Connected to ${selectedSide} (${chipType})`;
                chipInfoElem.innerHTML = chipInfoText;

                // Update UI
                connected = true;
                updateButtonStates(); // Will enable disconnect, flash, erase etc.

                // Get flash size (optional, but good confirmation)
                try {
                    const flashSizeBytes = await espLoader.getFlashSize(); // Now safe to call after main()
                    if (flashSizeBytes) {
                        const sizeInMB = flashSizeBytes / (1024 * 1024);
                        espLoaderTerminal.writeLine(`Flash size: ${sizeInMB} MB`);
                    }
                } catch (error) {
                    espLoaderTerminal.writeLine("Couldn't determine flash size");
                }

                // Enable next button (Step 3)
                if (nextToStep3Button) nextToStep3Button.disabled = false;

                // Update status indicator
                updateStatusIndicator('success', 'Connected', `${selectedSide} (${chipType})`);

                // Log device info (remains useful)
                espLoaderTerminal.writeLine("Device info:");
                try {
                    if (device.getInfo) {
                        const info = device.getInfo();
                        espLoaderTerminal.writeLine(`USB Vendor ID: 0x${info.usbVendorId.toString(16).padStart(4, '0')}`);
                        espLoaderTerminal.writeLine(`USB Product ID: 0x${info.usbProductId.toString(16).padStart(4, '0')}`);
                    }
                } catch (e) {
                    espLoaderTerminal.writeLine("Could not get device details");
                }

                // --- REMOVED: Redundant sync() call ---
                // const syncAttempt = await espLoader.sync();
                // espLoaderTerminal.writeLine("Bootloader sync " + (syncAttempt ? "successful" : "failed"));
                // main() already handles synchronization.

            } catch (error) {
                console.error("Error during connection with main():", error);
                let userMessage = `Error: ${error.message}`; // Default message for terminal
                let chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Connection failed`; // Default for chipInfoElem
                let statusIndicatorDetails = `Error: ${error.message}`; // Default for status indicator details
                let statusIndicatorTitle = 'Connection Failed'; // Default title

                // Check for specific error types
                const errorStr = error.message.toLowerCase();

                if (errorStr.includes("failed to connect") ||
                    errorStr.includes("timed out waiting for packet") ||
                    errorStr.includes("invalid head of packet") ||
                    errorStr.includes("no serial data received")) {
                    // Bootloader/Sync specific errors
                    userMessage = `Connection failed. Ensure the device is in bootloader mode (hold BOOT, press RESET) and try again. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Check Bootloader Mode`;
                    statusIndicatorTitle = 'Check Bootloader Mode';
                    statusIndicatorDetails = 'Hold BOOT/FLASH, press RESET, then try connecting.';
                } else if (errorStr.includes("access denied") || 
                           errorStr.includes("port is already open") ||
                           errorStr.includes("failed to open serial port")) {
                    // Port access errors
                    userMessage = `Error: Could not open serial port. Is it already open in another program (like Arduino IDE, PlatformIO Monitor)? Close other connections and try again. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Port In Use?`;
                    statusIndicatorTitle = 'Port Access Error';
                    statusIndicatorDetails = 'Close other serial programs (IDE, Monitor) and retry.';
                } else if (errorStr.includes("the device has been lost")) {
                    // Device disconnected errors
                    userMessage = `Error: Device disconnected during connection attempt. Check cable and connection. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Device Lost`;
                    statusIndicatorTitle = 'Device Disconnected';
                    statusIndicatorDetails = 'Check USB cable and connection.';
                } else {
                    // Generic fallback for other errors
                    userMessage = `Connection Error: ${error.message}`;
                     chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Connection Failed`;
                     statusIndicatorTitle = 'Connection Failed';
                     statusIndicatorDetails = `Error: ${error.message}`; // Show the actual error here
                }


                espLoaderTerminal.writeLine(userMessage); // Display detailed message in terminal
                chipInfoElem.innerHTML = chipInfoMessage; // Update chip info display
                // Ensure connect button is re-enabled on failure
                if (connectButton) connectButton.disabled = false;
                connected = false; // Ensure state is consistent
                updateButtonStates(); // Update UI based on failed state
                updateStatusIndicator('error', statusIndicatorTitle, statusIndicatorDetails); // Update status indicator with appropriate details
            }
        }
        
        async function disconnect() {
            if (transport && espLoader) {
                try {
                    await transport.disconnect();
                    espLoaderTerminal.writeLine("Disconnected from device");
                    connected = false;
                    updateButtonStates();
                    chipInfoElem.innerHTML = `<span class="status-indicator status-disconnected"></span> Disconnected`;
                    nextToStep3Button.disabled = true;
                    return true;
                } catch (error) {
                    console.error(error);
                    espLoaderTerminal.writeLine(`Error disconnecting: ${error.message}`);
                    return false;
                }
            }
            // If already disconnected, ensure state is correct
            connected = false;
            updateButtonStates();
            chipInfoElem.innerHTML = `<span class="status-indicator status-disconnected"></span> Disconnected`;
            if (nextToStep3Button) nextToStep3Button.disabled = true;
            return true;
        }
        
        async function flash() {
            if (!connected || !espLoader) {
                espLoaderTerminal.writeLine("Not connected to a device");
                return;
            }

            if (!hasFirmwareFilesSelected()) {
                espLoaderTerminal.writeLine("Please select at least one firmware file");
                return;
            }

            // Clear ETA at the start
            if (flashETAElem) flashETAElem.textContent = '';

            // Save device information for reconnection
            const savedDevice = selectedDevice;
            const savedSide = selectedSide;
            const savedBaudrate = baudrateSelect.value;
            const savedResetMethod = resetMethodSelect.value;

            // Store files info for validation after reconnect
            window.filesToValidate = [];

            // Disable buttons during flash
            flashButton.disabled = true;
            eraseButton.disabled = true;
            disconnectButton.disabled = true;
            if (resetButton) resetButton.disabled = true; // Disable reset during flash too

            let flashStartTime = null; // Variable to store flash start time

            try {
                espLoaderTerminal.writeLine("Preparing to flash...");
                chipInfoElem.innerHTML = `<span class="status-indicator status-flashing"></span> Preparing Flash...`;
                updateStatusIndicator('flashing', 'Preparing flash...', '');

                // --- Start: Erase Logic Update ---
                let eraseSuccessful = true; // Assume success if not erasing
                if (eraseAllCheckbox.checked) {
                    espLoaderTerminal.writeLine("Erase requested before flashing. This may take a moment...");
                    updateStatusIndicator('flashing', 'Erasing flash...', 'This may take a moment...');
                    try {
                        await eraseFlashInternal(); // Await the erase operation
                    } catch (eraseError) {
                        espLoaderTerminal.writeLine(`❌ Erase failed: ${eraseError.message}. Aborting flash operation.`);
                        chipInfoElem.innerHTML = `<span class="status-indicator status-error"></span> Erase Failed`;
                        updateStatusIndicator('error', 'Erase Failed', eraseError.message);
                        eraseSuccessful = false; // Mark erase as failed
                    }
                } else {
                    espLoaderTerminal.writeLine("Skipping erase step as checkbox is not checked.");
                }

                if (!eraseSuccessful) {
                    updateButtonStates();
                    return; // Stop the flash process
                }
                // --- End: Erase Logic Update ---


                espLoaderTerminal.writeLine("Processing firmware files...");
                updateStatusIndicator('flashing', 'Processing files...', '');


                // Collect all firmware files and addresses
                const fileArray = [];

                // Process each file input
                for (const [inputElem, addressInput, fileType] of [
                    [appFileInput, appAddressInput, 'Application'],
                    [bootloaderFileInput, bootloaderAddressInput, 'Bootloader'],
                    [partitionFileInput, partitionAddressInput, 'Partition']
                ]) {
                    if (inputElem && inputElem.files && inputElem.files.length > 0) {
                        const file = inputElem.files[0];
                        const firmware = await file.arrayBuffer();
                        const flashAddress = parseInt(addressInput.value, 16);

                        const uint8Data = new Uint8Array(firmware);
                        let binaryString = '';
                        for (let i = 0; i < uint8Data.length; i++) {
                            binaryString += String.fromCharCode(uint8Data[i]);
                        }

                        const fileInfo = {
                            data: binaryString,
                            address: flashAddress,
                            name: file.name,
                            type: fileType,
                            size: uint8Data.length
                        };

                        fileArray.push(fileInfo);
                        window.filesToValidate.push(fileInfo);
                    }
                }

                fileArray.sort((a, b) => a.address - b.address);

                // Inside flash function
                chipType = espLoader.chip.CHIP_NAME;
                let correctBootloaderOffset = 0x1000;

                if (chipType.includes("ESP32-S3") ||
                    chipType.includes("ESP32-C3") ||
                    chipType.includes("ESP32-C6")) {
                    correctBootloaderOffset = 0x0;
                    espLoaderTerminal.writeLine(`Adjusted bootloader offset to 0x0 for ${chipType}`);
                }

                for (let i = 0; i < fileArray.length; i++) {
                    if (fileArray[i].type === 'Bootloader' &&
                        fileArray[i].address !== correctBootloaderOffset) {
                        espLoaderTerminal.writeLine(`WARNING: Bootloader address doesn't match chip type! Adjusting from ${fileArray[i].address.toString(16)} to ${correctBootloaderOffset.toString(16)}`);
                        fileArray[i].address = correctBootloaderOffset;
                    }
                }

                chipInfoElem.innerHTML = `<span class="status-indicator status-flashing"></span> Flashing...`;
                updateStatusIndicator('flashing', 'Flashing firmware...', 'Do not disconnect');

                // Helper function to format seconds into MM:SS
                const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}m ${secs}s`;
                };

                const flashOptions = {
                    fileArray: fileArray.map(item => ({ data: item.data, address: item.address })),
                    flashSize: "keep",
                    flashMode: flashModeSelect.value,
                    flashFreq: flashFreqSelect.value,
                    eraseAll: false, // Erase handled above
                    compress: true,
                    reportProgress: (fileIndex, written, total) => {
                        const percentage = Math.floor((written / total) * 100);
                        flashProgressElem.style.width = `${percentage}%`;
                        const fileName = fileArray[fileIndex] ? fileArray[fileIndex].name : 'unknown';
                        espLoaderTerminal.writeLine(`Flashing ${fileName}: ${percentage}% (${written}/${total} bytes)`);

                        // Calculate and display ETA
                        if (flashStartTime && written > 0 && flashETAElem) {
                            const currentTime = Date.now();
                            const elapsedTimeSeconds = (currentTime - flashStartTime) / 1000;

                            // Don't show ETA immediately or if speed is zero
                            if (elapsedTimeSeconds > 1) {
                                const bytesPerSecond = written / elapsedTimeSeconds;
                                if (bytesPerSecond > 0) {
                                    const remainingBytes = total - written;
                                    const remainingSeconds = remainingBytes / bytesPerSecond;
                                    flashETAElem.textContent = `ETA: ${formatTime(remainingSeconds)}`;
                                } else {
                                    flashETAElem.textContent = 'ETA: Calculating...';
                                }
                            } else {
                                flashETAElem.textContent = 'ETA: Calculating...';
                            }
                        } else if (flashETAElem) {
                            flashETAElem.textContent = ''; // Clear if no start time or not started
                        }
                    },
                    calculateMD5Hash: calculateMd5Hash
                };

                // Add retry logic for the actual flashing
                let flashSuccess = false;
                let retryCount = 0;
                const maxRetries = 2;
                flashStartTime = Date.now(); // Record start time just before flashing begins

                while (!flashSuccess && retryCount <= maxRetries) {
                    try {
                        espLoaderTerminal.writeLine(`Starting flash write operation${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}...`);
                        await espLoader.writeFlash(flashOptions);
                        flashSuccess = true;
                        espLoaderTerminal.writeLine("\nFlash write complete!");
                    } catch (flashError) {
                        retryCount++;
                        if (retryCount <= maxRetries) {
                            espLoaderTerminal.writeLine(`\nFlash write attempt failed: ${flashError.message}. Retrying...`);
                            try {
                                await espLoader.sync();
                            } catch (e) {
                                // Ignore sync errors
                            }
                        } else {
                            throw flashError; // No more retries
                        }
                    }
                }

                // --- Post-Flash Actions ---
                flashProgressElem.style.width = '100%';
                if (flashETAElem) flashETAElem.textContent = ''; // Clear ETA on completion
                chipInfoElem.innerHTML = `<span class="status-indicator status-success"></span> Flash Complete`;
                updateStatusIndicator('success', 'Flash complete!', 'Attempting device reset...');

                try {
                    espLoaderTerminal.writeLine("Attempting soft reset (into app)...");
                    await espLoader.softReset(true);
                    espLoaderTerminal.writeLine("Soft reset command sent.");
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (resetError) {
                    console.error("Soft reset failed:", resetError);
                    espLoaderTerminal.writeLine(`Note: Soft reset command failed: ${resetError.message}. Manual reset may be required.`);
                }

                try {
                    await disconnect();
                } catch (err) {
                     espLoaderTerminal.writeLine(`Note: Disconnect error after reset: ${err.message}`);
                } finally {
                    const actionButtons = document.querySelector('.action-buttons');
                    if (actionButtons) {
                         actionButtons.innerHTML = `
                             <button id="flashButton" class="btn btn-primary">
                                 <i class="bi bi-lightning"></i> Flash Firmware
                             </button>
                             <button id="eraseButton" class="btn btn-danger">
                                 <i class="bi bi-trash"></i> Erase Flash
                             </button>
                             <button id="resetButton" class="btn btn-secondary">
                                 <i class="bi bi-arrow-repeat"></i> Reset Device
                             </button>
                         `;
                         // Reattach event listeners
                        document.getElementById('flashButton').addEventListener('click', flash);
                        document.getElementById('eraseButton').addEventListener('click', eraseFlash);
                        document.getElementById('resetButton').addEventListener('click', resetDevice);
                        // Add back the disconnect button which is missing now
                        // Need to decide if disconnect should be present after flashing+reset attempt
                        // Let's assume yes, but it might not work if the device truly reset
                        actionButtons.insertAdjacentHTML('beforeend', `
                             <button id="disconnectButton" class="btn btn-secondary ms-2">
                                 <i class="bi bi-x-circle"></i> Disconnect
                             </button>
                         `);
                        const disconnectBtn = document.getElementById('disconnectButton');
                        if (disconnectBtn) disconnectBtn.addEventListener('click', disconnect);
                    }
                    connected = false; // Assume disconnect happened or reset lost connection
                    updateButtonStates();
                    espLoaderTerminal.writeLine("Flash process complete. Device may have reset.");
                    updateStatusIndicator('success', 'Flash Complete', 'Device may have reset. Disconnected.');
                }

            } catch (error) {
                console.error("Error during flash process:", error);
                espLoaderTerminal.writeLine(`\nError flashing: ${error.message}`);
                if (flashETAElem) flashETAElem.textContent = '';
                chipInfoElem.innerHTML = `<span class="status-indicator status-error"></span> Flash failed`;
                flashProgressElem.style.width = '0%';
                updateStatusIndicator('error', 'Flash failed', error.message);
            } finally {
                 // Ensure buttons are re-enabled based on the final state (connected or not)
                 updateButtonStates();
            }
        }
        
        // Replace the calculateMd5 function with this simpler version
        function calculateMd5Hash(image) {
            // Just return null to use the built-in CRC verification
            // This is safer than trying to use MD5 which is deprecated in modern browsers
            return null;
        }

        // NEW Internal helper function for erasing flash
        async function eraseFlashInternal() {
            if (!connected || !espLoader) {
                espLoaderTerminal.writeLine("Not connected to a device to erase.");
                throw new Error("Device not connected for erasing.");
            }

            // --- Show Global Indicator ---
            if (globalStatusIndicator) {
                globalStatusIndicator.textContent = '⏳ Erasing flash, please wait... This may take a moment.';
                globalStatusIndicator.className = 'alert alert-warning mt-3'; // Reset classes and show
                globalStatusIndicator.classList.remove('d-none');
            }

            try {
                // --- CHANGE: Improve Erase Feedback ---
                espLoaderTerminal.writeLine("Erasing flash (this may take a moment)...");
                chipInfoElem.innerHTML = `<span class="status-indicator status-flashing"></span> Erasing...`;
                updateStatusIndicator('flashing', 'Erasing flash...', 'This may take a moment...');
                // --- End Change ---

                await espLoader.eraseFlash();

                espLoaderTerminal.writeLine("Flash erased successfully");
                chipInfoElem.innerHTML = `<span class="status-indicator status-connected"></span> Flash erased`;
                updateStatusIndicator('success', 'Flash erased', 'Ready to flash firmware');
                
                // --- Update Global Indicator on Success ---
                if (globalStatusIndicator) {
                    globalStatusIndicator.textContent = '✅ Flash erased successfully.';
                    globalStatusIndicator.className = 'alert alert-success mt-3'; // Change to success style
                    // Optional: Hide after a delay
                    setTimeout(() => globalStatusIndicator.classList.add('d-none'), 3000); 
                }

                return true; // Indicate success
            } catch (error) {
                console.error("Error during erase:", error);
                espLoaderTerminal.writeLine(`Error erasing flash: ${error.message}`);
                chipInfoElem.innerHTML = `<span class="status-indicator status-disconnected"></span> Erase failed`;
                updateStatusIndicator('error', 'Erase failed', error.message);
                
                // --- Update Global Indicator on Error ---
                 if (globalStatusIndicator) {
                    globalStatusIndicator.textContent = `❌ Error erasing flash: ${error.message}`;
                    globalStatusIndicator.className = 'alert alert-danger mt-3'; // Change to error style
                     // Optional: Hide after a delay
                    setTimeout(() => globalStatusIndicator.classList.add('d-none'), 5000); 
                 }

                throw error; // Rethrow the error to be caught by the caller if needed
            } 
            // --- REMOVED finally block for hiding indicator here, handled in success/error ---
        }

        // UPDATED eraseFlash function (for the button)
        async function eraseFlash() {
            if (!connected || !espLoader) {
                espLoaderTerminal.writeLine("Not connected to a device");
                return;
            }

            // Disable buttons during erase
            eraseButton.disabled = true;
            flashButton.disabled = true;
            if (resetButton) resetButton.disabled = true; // Disable reset during erase

            try {
                // The indicator is now managed within eraseFlashInternal
                await eraseFlashInternal();
                // Erase was successful
            } catch (error) {
                // Error already logged and indicator handled by eraseFlashInternal
                espLoaderTerminal.writeLine("Standalone erase operation failed.");
            } finally {
                // Re-enable buttons based on state
                updateButtonStates();
            }
        }
        
        async function resetDevice() {
            if (!connected || !espLoader) {
                espLoaderTerminal.writeLine("Not connected to a device");
                return;
            }

            // Disable reset button during operation
            if(resetButton) resetButton.disabled = true;

            try {
                espLoaderTerminal.writeLine("Attempting soft reset (into app)...");
                chipInfoElem.innerHTML = `<span class="status-indicator status-flashing"></span> Resetting...`;
                updateStatusIndicator('flashing', 'Resetting...', '');

                // --- CHANGE: Use softReset(true) ---
                await espLoader.softReset(true);
                espLoaderTerminal.writeLine("Soft reset command sent.");
                // --- End Change ---

                chipInfoElem.innerHTML = `<span class="status-indicator status-connected"></span> Device reset initiated`;
                updateStatusIndicator('success', 'Reset initiated', 'Device should restart');

                // Assume connection is lost after reset attempt
                setTimeout(() => {
                     connected = false;
                     updateButtonStates();
                     chipInfoElem.innerHTML = `<span class="status-indicator status-disconnected"></span> Reset attempted, likely disconnected`;
                     updateStatusIndicator('disconnected', 'Disconnected', 'Device reset attempted');
                 }, 1000);

            } catch (error) {
                console.error("Soft reset failed:", error);
                espLoaderTerminal.writeLine(`Note: Soft reset failed: ${error.message}. Manual reset may be required.`);
                chipInfoElem.innerHTML = `<span class="status-indicator status-warning"></span> Reset command failed`;
                updateStatusIndicator('error', 'Reset Failed', error.message);
                 // Re-enable button only if the command fails immediately
                 if (!connected && resetButton) resetButton.disabled = false; // Should be disconnected by timeout anyway
                 else if (connected && resetButton) resetButton.disabled = !connected; // Re-enable based on actual state if timeout hasn't fired
            }
        }
        
        function updateButtonStates() {
            // Connection buttons
            if (connectButton) connectButton.disabled = connected;
            if (disconnectButton) disconnectButton.disabled = !connected;
            
            // Action buttons
            if (flashButton) flashButton.disabled = !connected || !hasFirmwareFilesSelected();
            if (eraseButton) eraseButton.disabled = !connected;
            if (resetButton) resetButton.disabled = !connected;
            
            // Connection settings
            if (baudrateSelect) baudrateSelect.disabled = connected;
            if (resetMethodSelect) resetMethodSelect.disabled = connected;

            // Disable next step if not connected
            if (nextToStep3Button) nextToStep3Button.disabled = !connected;
        }
        
        // Check if WebSerial is supported
        if (!navigator.serial) {
            espLoaderTerminal.writeLine("WebSerial is not supported in this browser. Please use Chrome or Edge version 89 or later.");
            connectButton.disabled = true;
            
            // Create and show a modal popup with dark theme styling
            const modalHtml = `
            <div class="modal fade" id="webSerialModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                Browser Not Supported
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger">
                                <i class="bi bi-exclamation-triangle-fill"></i>
                                WebSerial is not supported in this browser.
                            </div>
                            <p>Please use a supported browser:</p>
                            <ul>
                                <li>Chrome (v89+)</li>
                                <li>Edge (v89+)</li>
                                <li>Opera (v76+)</li>
                            </ul>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>`;
            
            // Append modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Show the modal
            const webSerialModal = new bootstrap.Modal(getElementById('webSerialModal'));
            webSerialModal.show();
        } else {
            espLoaderTerminal.writeLine("ESPressoFlasher ready. Please select your device type.");
        }
        
        // Initialize the UI
        goToStep(1);

        // Add event listeners for "I'm Stuck" buttons
        const stuckButtons = document.querySelectorAll('.stuck-button');
        console.log('[Debug] Found stuck buttons:', stuckButtons.length); // Log: Check if buttons are found
        console.log('[Debug] Bootstrap object available?', typeof bootstrap !== 'undefined', window.bootstrap); // Log: Check Bootstrap object

        stuckButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const step = button.dataset.step;
                console.log(`[Debug] Stuck button clicked for step: ${step}`); // Log: Button click

                const modalId = `stuckModalStep${step}`;
                const modalElement = document.getElementById(modalId);
                console.log(`[Debug] Attempting to find modal element with ID: ${modalId}`, modalElement); // Log: Modal element search

                if (modalElement) {
                    console.log('[Debug] Modal element found.');
                    if (bootstrap && bootstrap.Modal) {
                        try {
                            console.log('[Debug] Bootstrap and bootstrap.Modal found. Creating and showing modal...'); // Log: Attempting to show
                            const modalInstance = new bootstrap.Modal(modalElement);
                            modalInstance.show();
                            console.log('[Debug] modalInstance.show() called.'); // Log: Show called
                        } catch (e) {
                            console.error('[Debug] Error creating or showing Bootstrap modal:', e); // Log: Error during modal show
                            espLoaderTerminal.writeLine(`Error showing help: ${e.message}`);
                        }
                    } else {
                        console.error('[Debug] Bootstrap Modal object not found!'); // Log: Bootstrap missing
                        espLoaderTerminal.writeLine('Error: Could not show help (Bootstrap Modal not loaded).');
                    }
                } else {
                    console.error(`[Debug] Could not find modal element #${modalId}`); // Log: Modal element missing
                    espLoaderTerminal.writeLine(`Error: Could not open help for step ${step} (modal element missing).`);
                }
            });
        });

        async function populateRepoOptions(owner, repo, selectElementId, defaultOptionText = '-- Select an option --') {
            const selectElement = getElementById(selectElementId);
            if (!selectElement) {
                console.error(`Select element with ID '${selectElementId}' not found.`);
                return;
            }

            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`; 
            selectElement.disabled = true; 

            try {
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                if (!data.assets || data.assets.length === 0) {
                    espLoaderTerminal.writeLine(`⚠️ No assets found in the latest ${repo} release.`);
                    selectElement.innerHTML = `<option value="">No assets found</option>`;
                    return;
                }

                let foundZip = false;
                data.assets.forEach(asset => {
                    if (asset.name.endsWith('.zip')) {
                        foundZip = true;
                        const option = document.createElement('option');
                        option.value = asset.browser_download_url; 
                        option.textContent = asset.name; 
                        selectElement.appendChild(option);
                    }
                });

                if (!foundZip) {
                     espLoaderTerminal.writeLine(`⚠️ No .zip assets found in the latest ${repo} release.`);
                     selectElement.innerHTML = `<option value="">No .zip files found</option>`;
                } else {
                     selectElement.disabled = false; 
                }

            } catch (error) {
                 console.error(`Error fetching ${repo} data:`, error);
                 espLoaderTerminal.writeLine(`⚠️ Failed to fetch ${repo} list: ${error.message}`);
                 selectElement.innerHTML = `<option value="">Error loading variants</option>`;
            }
        }

        if (firmwareSourceSelect) {
            firmwareSourceSelect.addEventListener('change', () => {
                const selectedSource = firmwareSourceSelect.value;

                manualUploadSection.classList.add('d-none');
                ghostEspDownloadSection.classList.add('d-none');
                
                if (downloadFirmwareLink) { 
                    downloadFirmwareLink.href = '#';
                    downloadFirmwareLink.classList.add('disabled');
                    downloadFirmwareLink.classList.replace('btn-primary', 'btn-secondary');
                }

                if (selectedSource === 'manual') {
                    manualUploadSection.classList.remove('d-none');
                } else if (selectedSource === 'ghostesp') {
                    ghostEspDownloadSection.classList.remove('d-none');
                    populateRepoOptions('Spooks4576', 'Ghost_ESP', 'repoSelect', '-- Select a variant... --');
                }
                
            });
        }

        if (repoSelect && downloadFirmwareLink) {
            repoSelect.addEventListener('change', () => {
                if (repoSelect.value) {
                    downloadFirmwareLink.href = repoSelect.value;
                    downloadFirmwareLink.classList.remove('disabled');
                    downloadFirmwareLink.classList.replace('btn-secondary', 'btn-primary');
                } else {
                    downloadFirmwareLink.href = '#';
                    downloadFirmwareLink.classList.add('disabled');
                    downloadFirmwareLink.classList.replace('btn-primary', 'btn-secondary');
                }
            });
        }
    }

    // Add this function to update the modern status indicator
    function updateStatusIndicator(status, message, details) {
        const statusIcon = document.querySelector('.status-icon');
        const statusMessage = document.getElementById('statusMessage');
        const statusDetails = document.getElementById('statusDetails');
        
        if (statusMessage) statusMessage.textContent = message || 'Ready';
        if (statusDetails) statusDetails.textContent = details || '';
        
        if (statusIcon) {
            // Reset all classes first
            statusIcon.className = 'bi status-icon';
            
            // Add appropriate icon class based on status
            switch (status) {
                case 'ready':
                    statusIcon.classList.add('bi-cpu');
                    break;
                case 'flashing':
                    statusIcon.classList.add('bi-lightning-charge');
                    break;
                case 'success':
                    statusIcon.classList.add('bi-check-circle');
                    break;
                case 'error':
                    statusIcon.classList.add('bi-exclamation-triangle');
                    break;
                case 'disconnected':
                    statusIcon.classList.add('bi-x-circle');
                    break;
                default:
                    statusIcon.classList.add('bi-cpu');
            }
        }
    }

    // Add this function to update the binary type buttons to show which have files
    function updateBinaryTypeIndicators() {
        // Check if app file is selected
        if (appFileInput && appFileInput.files && appFileInput.files.length > 0) {
            const appButton = document.querySelector('[data-binary="app"]');
            if (appButton && !appButton.querySelector('.file-badge')) {
                appButton.innerHTML += '<span class="file-badge"></span>';
            }
        }
        
        // Check if bootloader file is selected
        if (bootloaderFileInput && bootloaderFileInput.files && bootloaderFileInput.files.length > 0) {
            const bootloaderButton = document.querySelector('[data-binary="bootloader"]');
            if (bootloaderButton && !bootloaderButton.querySelector('.file-badge')) {
                bootloaderButton.innerHTML += '<span class="file-badge"></span>';
            }
        }
        
        // Check if partition file is selected
        if (partitionFileInput && partitionFileInput.files && partitionFileInput.files.length > 0) {
            const partitionButton = document.querySelector('[data-binary="partition"]');
            if (partitionButton && !partitionButton.querySelector('.file-badge')) {
                partitionButton.innerHTML += '<span class="file-badge"></span>';
            }
        }
    }

    // Add style to ensure visibility of changes
    const style = document.createElement('style');
    style.textContent = `
    .file-uploaded {
        border: 2px solid #5bf13d !important;
        background-color: rgba(91, 241, 61, 0.1) !important;
        transition: all 0.3s ease !important;
    }
    .file-uploaded span {
        color: #5bf13d !important;
        font-weight: 500 !important;
    }
    @keyframes pulse-flashing { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .status-flashing-anim { animation: pulse-flashing 1.5s infinite; }
    .file-badge {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: var(--success-color, #2ecc71);
        margin-left: 8px;
        vertical-align: middle;
        box-shadow: 0 0 5px var(--success-color, #2ecc71);
    }
    `;
    document.head.appendChild(style);

    // Add a helper to check UI state from console
    window.debugFileInputs = function() {
        ['appFile', 'bootloaderFile', 'partitionFile'].forEach(id => {
            const input = document.getElementById(id);
            const label = document.querySelector(`label[for="${id}"] span`);
            const info = document.getElementById(id + 'Info');
            const dropZone = document.querySelector(`label[for="${id}"]`);
            
            console.log(`${id}:`, {
                hasFiles: input?.files?.length > 0,
                fileName: input?.files?.[0]?.name,
                labelText: label?.innerHTML,
                infoText: info?.textContent,
                dropZoneHasClass: dropZone?.classList.contains('file-uploaded')
            });
        });
        console.log("Has Firmware Selected:", hasFirmwareFilesSelected());
        console.log("Connected:", connected);
    };

    // Also add this global debug function
    window.checkAllFileInputs = function() {
        const fileInputs = ['appFile', 'bootloaderFile', 'partitionFile'];
        fileInputs.forEach(id => {
            const input = document.getElementById(id);
            console.log(id, "has files:", input?.files?.length > 0, 
                        input?.files?.[0]?.name || "none");
        });
    };

}); 