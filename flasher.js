document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle functionality
    const titleToggle = document.getElementById('darkModeToggle');
    if (titleToggle) {
        titleToggle.addEventListener('click', () => {
            // Add gravity effect to title
            titleToggle.style.transition = 'all 0.5s ease';
            titleToggle.style.transform = 'translateY(10px)';
            
            // Toggle dark mode class
            document.documentElement.classList.toggle('dark-mode');
            
            // Apply gravity effect
            setTimeout(() => {
                titleToggle.style.transform = 'translateY(0)';
            }, 100);
            
            // Reset transition
            setTimeout(() => {
                titleToggle.style.transition = '';
            }, 600);
        });
    }
    
    window.addEventListener("dragover", (event) => {
        if (!event.target.closest('.custom-file-upload')) return;
        event.preventDefault();
    }, false);

    window.addEventListener("drop", (event) => {
        if (!event.target.closest('.custom-file-upload')) event.preventDefault();
    }, false);

    const loadingAnimation = window.initLoadingAnimation ? window.initLoadingAnimation() : null;
    const loadingStartTime = Date.now();
    const minDisplayTime = 3000;

    const checkEsptoolLoaded = () => {
        if (window.esptoolJS) {
            const currentTime = Date.now();
            const elapsedTime = currentTime - loadingStartTime;
            if (elapsedTime < minDisplayTime) {
                setTimeout(() => {
                    if (loadingAnimation) loadingAnimation.cleanup();
                    initializeFlasher();
                }, minDisplayTime - elapsedTime);
            } else {
                if (loadingAnimation) loadingAnimation.cleanup();
                initializeFlasher();
            }
        } else {
            setTimeout(checkEsptoolLoaded, 100);
        }
    };
    checkEsptoolLoaded();

    function initializeFlasher() {
        function getElementById(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`!!! Element with ID '${id}' not found in the DOM !!!`);
            }
            return element;
        }

        // --- Const Declarations ---
        const stepContainers = document.querySelectorAll('.step-container');
        const stepCircles = document.querySelectorAll('.stepper-circle');
        const nextToStep2Button = getElementById('nextToStep2');
        const backToStep1Button = getElementById('backToStep1');
        const nextToStep3Button = getElementById('nextToStep3');
        const backToStep2Button = getElementById('backToStep2');
        const nextToStep4Button = getElementById('nextToStep4');
        const backToStep3Button = getElementById('backToStep3');
        const startOverButton = getElementById('startOver');
        const connectButton = getElementById('connectButton');
        const disconnectButton = getElementById('disconnectButton');
        const flashButton = getElementById('flashButton');
        const eraseButton = getElementById('eraseButton');
        const resetButton = getElementById('resetButton');
        const terminalElem = getElementById('terminal');
        const terminalContainer = getElementById('terminal-container');
        const chipInfoElem = getElementById('chipInfo');
        const flashProgressElem = getElementById('flashProgress');
        const flashSummaryElem = getElementById('flashSummary');
        const flashETAElem = getElementById('flashETA');
        const selectedDeviceConnectElem = getElementById('selectedDeviceConnect');
        const globalStatusIndicator = getElementById('globalStatusIndicator');
        const binaryTypeButtons = document.querySelectorAll('.binary-type-toggle .btn');
        const appFirmwareSection = getElementById('appFirmware');
        const bootloaderFirmwareSection = getElementById('bootloaderFirmware');
        const partitionFirmwareSection = getElementById('partitionFirmware');
        const baudrateSelect = getElementById('baudrate');
        const flashModeSelect = getElementById('flashMode');
        const flashFreqSelect = getElementById('flashFreq');
        const flashSizeSelect = getElementById('flashSize');
        const resetMethodSelect = getElementById('resetMethod');
        const eraseAllCheckbox = getElementById('eraseAll');
        const appFileInput = getElementById('appFile');
        const bootloaderFileInput = getElementById('bootloaderFile');
        const partitionFileInput = getElementById('partitionFile');
        const appFileInfoElem = getElementById('appFileInfo');
        const bootloaderFileInfoElem = getElementById('bootloaderFileInfo');
        const partitionFileInfoElem = getElementById('partitionFileInfo');
        const appAddressInput = getElementById('appAddress');
        const bootloaderAddressInput = getElementById('bootloaderAddress');
        const partitionAddressInput = getElementById('partitionAddress');
        const showMoreDevicesButton = getElementById('showMoreDevicesButton');
        const showLessDevicesButton = getElementById('showLessDevicesButton');
        const rareDevicesContainer = getElementById('rareDevicesContainer');
        // const firmwareSourceSelect = getElementById('firmwareSourceSelect'); // No longer used directly
        const ghostEspDownloadSection = getElementById('ghostEspDownloadSection');
        const marauderDownloadSection = getElementById('marauderDownloadSection');
        const manualUploadSection = getElementById('manualUploadSection');
        const ghostEspVariantSelect = getElementById('ghostEspVariantSelect');
        const marauderVariantSelect = getElementById('marauderVariantSelect');
        const marauderDownloadLink = getElementById('marauderDownloadLink');
        const disableFilterToggle = getElementById('disableFilterToggle');
        const choiceDownloadCard = getElementById('choiceDownload');
        const choiceManualCard = getElementById('choiceManual');
        const downloadOptionsContainer = getElementById('downloadOptionsContainer');
        const manualUploadContainer = getElementById('manualUploadContainer');
        const downloadSourceSelect = getElementById('downloadSourceSelect');
        const ghostEspStatusElem = getElementById('ghostEspStatus');

        // --- Let Declarations (Moved Up) ---
        let espLoader = null;
        let transport = null;
        let connected = false;
        let chipType = '';
        let selectedDevice = null;
        let selectedSide = '';
        let currentStep = 1;
        let extractedGhostEspFiles = null;
        let selectedFirmwareMethod = null; // To track 'download' or 'manual'
        let ghostEspReleaseType = 'stable'; // track if user wants stable or prerelease
        let ghostEspStableReleases = null; // cache stable releases
        let ghostEspPrereleases = null; // cache prereleases

        // --- Initial UI State ---
        if (appFileInfoElem) appFileInfoElem.textContent = 'No file selected';
        if (bootloaderFileInfoElem) bootloaderFileInfoElem.textContent = 'No file selected';
        if (partitionFileInfoElem) partitionFileInfoElem.textContent = 'No file selected';

        // --- Terminal Object ---
        let espLoaderTerminal = {
            clean() {
                if (terminalElem) terminalElem.innerHTML = '';
            },
            writeLine(data) {
                if (terminalElem) {
                    terminalElem.innerHTML += data + '\n';
                    terminalElem.scrollTop = terminalElem.scrollHeight;
                }
                // updateStatusIndicator('flashing', 'Processing', data); // Maybe too noisy?
                console.log(data);
            },
            write(data) {
                if (terminalElem) {
                    terminalElem.innerHTML += data;
                    terminalElem.scrollTop = terminalElem.scrollHeight;
                }
                console.log(data);
            }
        };

        // --- Device Options Const ---
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
                defaultFlashFreq: '80m',
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

        // --- Event Listeners ---
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
            clearExtractedData(); // Clear loaded ZIP data
            clearManualInputs(); // Also clear manual inputs
            if (connected) {
                disconnect().then(() => goToStep(1));
            } else {
                goToStep(1);
            }
        });

        if (binaryTypeButtons && binaryTypeButtons.length > 0) {
            binaryTypeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    binaryTypeButtons.forEach(btn => btn.classList.remove('active'));
                    if (appFirmwareSection) appFirmwareSection.classList.add('d-none');
                    if (bootloaderFirmwareSection) bootloaderFirmwareSection.classList.add('d-none');
                    if (partitionFirmwareSection) partitionFirmwareSection.classList.add('d-none');
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

        const deviceCards = document.querySelectorAll('.device-card');
        deviceCards.forEach(card => {
            card.addEventListener('click', () => {
                deviceCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedDevice = card.dataset.device;
                selectedSide = card.querySelector('.device-name').textContent;
                espLoaderTerminal.writeLine(`Selected: ${selectedSide} (${selectedDevice})`);
                updateDefaultAddresses();
                if (nextToStep2Button) nextToStep2Button.disabled = false;
            });
        });

        if (showMoreDevicesButton && rareDevicesContainer && showLessDevicesButton) {
            showMoreDevicesButton.addEventListener('click', () => {
                rareDevicesContainer.classList.remove('d-none');
                showMoreDevicesButton.classList.add('d-none');
                showLessDevicesButton.classList.remove('d-none');
            });

            showLessDevicesButton.addEventListener('click', () => {
                rareDevicesContainer.classList.add('d-none');
                showLessDevicesButton.classList.add('d-none');
                showMoreDevicesButton.classList.remove('d-none');
            });
        }

        connectButton.addEventListener('click', connect);
        disconnectButton.addEventListener('click', disconnect);
        flashButton.addEventListener('click', flash);
        eraseButton.addEventListener('click', eraseFlash);
        resetButton.addEventListener('click', resetDevice);

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

        function setupFileInputHandling(dropZone, fileInput, infoElement) {
            if (!dropZone || !fileInput || !infoElement) {
                console.error("Missing elements for file input handling:", fileInput?.id);
                return;
            }
            const updateDisplay = (file) => {
                const fileSizeKB = Math.round(file.size / 1024);
                infoElement.textContent = `${file.name} (${fileSizeKB} KB)`;
                const uploadLabel = dropZone.querySelector('span');
                if (uploadLabel) {
                    uploadLabel.innerHTML = `<i class="bi bi-file-earmark-check"></i> ${file.name}`;
                }
                dropZone.classList.add('file-uploaded');
                updateBinaryTypeIndicators();
                updateButtonStates();
            };
            fileInput.onchange = function() {
                if (this.files && this.files.length > 0) {
                    updateDisplay(this.files[0]);
                } else {
                    infoElement.textContent = 'No file selected';
                    const uploadLabel = dropZone.querySelector('span');
                    if (uploadLabel) {
                        uploadLabel.innerHTML = `<i class="bi bi-upload"></i> Upload ${fileInput.id.replace('File', '')} Binary`;
                    }
                    dropZone.classList.remove('file-uploaded');
                    updateBinaryTypeIndicators();
                    updateButtonStates();
                }
            };
            dropZone.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target !== fileInput) {
                    fileInput.click();
                }
            };
            dropZone.addEventListener('dragover', (event) => {
                event.stopPropagation();
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', (event) => {
                event.stopPropagation();
                event.preventDefault();
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('drag-over');
                const files = e.dataTransfer?.files;
                if (!files?.length) return;
                const file = files[0];
                if (!file.name.toLowerCase().endsWith('.bin')) {
                    espLoaderTerminal.writeLine('⚠️ Only .bin files accepted');
                    return;
                }
                try { fileInput.files = files; } catch (_) {}
                const changeEvent = new Event('change');
                fileInput.dispatchEvent(changeEvent);
            });
            if (window[fileInput.id + '_debug']) {
                delete window[fileInput.id + '_debug'];
            }
            window[fileInput.id + '_debug'] = function() {};
            console.log("File input handling (including drag/drop) setup COMPLETE for", fileInput.id);
        }

        function goToStep(step) {
            stepContainers.forEach(container => container.classList.remove('active'));
            stepCircles.forEach(circle => {
                circle.classList.remove('active');
                circle.classList.remove('completed');
            });
            const targetStepContainer = document.getElementById(`step${step}`);
            if (targetStepContainer) {
                targetStepContainer.classList.add('active');
            }
            for (let i = 0; i < stepCircles.length; i++) {
                if (i + 1 < step) {
                    stepCircles[i].classList.add('completed');
                } else if (i + 1 === step) {
                    stepCircles[i].classList.add('active');
                }
            }
            currentStep = step;
            updateButtonStates();
        }

        function updateDefaultAddresses() {
            if (selectedDevice && deviceOptions[selectedDevice]) {
                const options = deviceOptions[selectedDevice];
                flashModeSelect.value = options.defaultFlashMode;
                flashFreqSelect.value = options.defaultFlashFreq;
                flashSizeSelect.value = options.defaultFlashSize;
                if (appAddressInput) appAddressInput.value = options.appAddress;
                if (bootloaderAddressInput) bootloaderAddressInput.value = options.bootloaderAddress;
                if (partitionAddressInput) partitionAddressInput.value = options.partitionAddress;
            }
        }

        function updateFileInfo(fileInput, infoElement) {
            if (fileInput.files && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileSizeKB = Math.round(file.size / 1024);
                infoElement.textContent = `${file.name} (${fileSizeKB} KB)`;
            } else {
                infoElement.textContent = 'No file selected';
            }
        }

        function updateFlashSummary() {
            flashSummaryElem.innerHTML = '';
            flashSummaryElem.classList.add('flash-summary-box');
            let hasBinaries = false;
            const addSummaryItem = (icon, text) => {
                flashSummaryElem.innerHTML += `<div class="summary-item"><i class="bi ${icon} me-2"></i> ${text}</div>`;
            };

            // --- FIX: Use selectedFirmwareMethod instead of firmwareSourceSelect.value ---
            // const source = firmwareSourceSelect.value; // REMOVE THIS

            // Check based on the *selected method*
            if (selectedFirmwareMethod === 'download' && extractedGhostEspFiles) {
                // Use extracted GhostESP data 
                 if (extractedGhostEspFiles.app.data) {
                     const address = extractedGhostEspFiles.app.addressInput.value;
                     addSummaryItem('bi-file-earmark-binary', `Application: ${extractedGhostEspFiles.app.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
                 if (extractedGhostEspFiles.bootloader.data) {
                     const address = extractedGhostEspFiles.bootloader.addressInput.value;
                     addSummaryItem('bi-hdd-network', `Bootloader: ${extractedGhostEspFiles.bootloader.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
                 if (extractedGhostEspFiles.partition.data) {
                     const address = extractedGhostEspFiles.partition.addressInput.value;
                     addSummaryItem('bi-table', `Partition Table: ${extractedGhostEspFiles.partition.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
            } else if (selectedFirmwareMethod === 'manual') {
                // Use manual inputs 
                 if (appFileInput?.files?.length > 0) {
                    const file = appFileInput.files[0];
                    const address = appAddressInput.value;
                    addSummaryItem('bi-file-earmark-binary', `Application: ${file.name} at ${address}`);
                    hasBinaries = true;
                 }
                 if (bootloaderFileInput?.files?.length > 0) {
                    const file = bootloaderFileInput.files[0];
                    const address = bootloaderAddressInput.value;
                    addSummaryItem('bi-hdd-network', `Bootloader: ${file.name} at ${address}`);
                    hasBinaries = true;
                 }
                 if (partitionFileInput?.files?.length > 0) {
                    const file = partitionFileInput.files[0];
                    const address = partitionAddressInput.value;
                    addSummaryItem('bi-table', `Partition Table: ${file.name} at ${address}`);
                    hasBinaries = true;
                 }
            } // else: No method selected or no files yet

            // --- The rest of the function is fine ---
            if (!hasBinaries) {
                flashSummaryElem.innerHTML = '<div class="summary-item text-warning"><i class="bi bi-exclamation-triangle me-2"></i> Select method and provide firmware</div>';
                if (flashButton) flashButton.disabled = true; 
            } else {
                 if (flashButton) flashButton.disabled = !connected; 
            }
            addSummaryItem('bi-gear', `Settings: ${flashModeSelect.value.toUpperCase()}, ${flashFreqSelect.value}, ${flashSizeSelect.value}`);
            if (eraseAllCheckbox.checked) {
                addSummaryItem('bi-eraser-fill text-warning', '<strong>Erase all flash before programming</strong>');
            }
             updateButtonStates(); 
        }

        function hasFirmwareFilesSelected() {
            // --- FIX: Use selectedFirmwareMethod instead of firmwareSourceSelect.value ---
             // const source = firmwareSourceSelect.value; // REMOVE THIS

             // Check based on the *selected method*
             if (selectedFirmwareMethod === 'download') {
                 // If download was chosen, check if Ghost files were extracted
                 return extractedGhostEspFiles && (extractedGhostEspFiles.app.data || extractedGhostEspFiles.bootloader.data || extractedGhostEspFiles.partition.data);
             } else if (selectedFirmwareMethod === 'manual') {
                 // Original check for manual files
                 return (appFileInput?.files?.length > 0) ||
                        (bootloaderFileInput?.files?.length > 0) ||
                        (partitionFileInput?.files?.length > 0);
             }
             return false; // No method selected yet
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
                
                // --- Check Filter Toggle ---
                let serialOptions = {}; // Default to no filters
                const filtersDisabled = disableFilterToggle.checked; 

                if (!filtersDisabled && selectedDevice && deviceOptions[selectedDevice] && deviceOptions[selectedDevice].filters) {
                    serialOptions.filters = deviceOptions[selectedDevice].filters;
                    espLoaderTerminal.writeLine(`Applying filters: ${JSON.stringify(serialOptions.filters)}`);
                } else if (filtersDisabled) {
                     espLoaderTerminal.writeLine(`Serial port filters disabled by user.`);
                } else {
                     espLoaderTerminal.writeLine(`No specific filters applied for ${selectedDevice || 'unknown device'}.`);
                }
                // --- End Check ---

                const device = await navigator.serial.requestPort(serialOptions); // Use potentially modified options
                transport = new window.esptoolJS.Transport(device);

                espLoaderTerminal.writeLine("Connecting to device...");
                updateStatusIndicator('flashing', 'Connecting...', '');
                const baudrate = parseInt(baudrateSelect.value);
                espLoader = new window.esptoolJS.ESPLoader({
                    transport: transport,
                    baudrate: baudrate,
                    terminal: espLoaderTerminal,
                    enableTracing: true
                });
                chipType = await espLoader.main();
                espLoaderTerminal.writeLine(`Connected to ${selectedSide} (${chipType})`);
                let chipInfoText = `<span class="status-indicator status-connected"></span> Connected to ${selectedSide} (${chipType})`;
                chipInfoElem.innerHTML = chipInfoText;
                connected = true;
                updateButtonStates();
                try {
                    const flashSizeBytes = await espLoader.getFlashSize();
                    if (flashSizeBytes) {
                        const sizeInMB = flashSizeBytes / (1024 * 1024);
                        espLoaderTerminal.writeLine(`Flash size: ${sizeInMB} MB`);
                    }
                } catch (error) {
                    espLoaderTerminal.writeLine("Couldn't determine flash size");
                }
                if (nextToStep3Button) nextToStep3Button.disabled = false;
                updateStatusIndicator('success', 'Connected', `${selectedSide} (${chipType})`);
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
            } catch (error) {
                console.error("Error during connection with main():", error);
                let userMessage = `Error: ${error.message}`;
                let chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Connection failed`;
                let statusIndicatorDetails = `Error: ${error.message}`;
                let statusIndicatorTitle = 'Connection Failed';
                const errorStr = error.message.toLowerCase();
                if (errorStr.includes("failed to connect") ||
                    errorStr.includes("timed out waiting for packet") ||
                    errorStr.includes("invalid head of packet") ||
                    errorStr.includes("no serial data received")) {
                    userMessage = `Connection failed. Ensure the device is in bootloader mode (hold BOOT, press RESET) and try again. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Check Bootloader Mode`;
                    statusIndicatorTitle = 'Check Bootloader Mode';
                    statusIndicatorDetails = 'Hold BOOT/FLASH, press RESET, then try connecting.';
                } else if (errorStr.includes("access denied") ||
                    errorStr.includes("port is already open") ||
                    errorStr.includes("failed to open serial port")) {
                    userMessage = `Error: Could not open serial port. Is it already open in another program (like Arduino IDE, PlatformIO Monitor)? Close other connections and try again. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Port In Use?`;
                    statusIndicatorTitle = 'Port Access Error';
                    statusIndicatorDetails = 'Close other serial programs (IDE, Monitor) and retry.';
                } else if (errorStr.includes("the device has been lost")) {
                    userMessage = `Error: Device disconnected during connection attempt. Check cable and connection. (Error: ${error.message})`;
                    chipInfoMessage = `<span class="status-indicator status-disconnected"></span> Failed: Device Lost`;
                    statusIndicatorTitle = 'Device Disconnected';
                    statusIndicatorDetails = 'Check USB cable and connection.';
                } else {
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
                espLoaderTerminal.writeLine("Please select/load at least one firmware file");
                return;
            }

            // Clear ETA at the start
            if (flashETAElem) flashETAElem.textContent = '';

            // Save device information for reconnection
            const savedDevice = selectedDevice;
            const savedSide = selectedSide;
            const savedBaudrate = baudrateSelect.value;
            const savedResetMethod = resetMethodSelect.value;

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

                const fileArray = [];
                const source = selectedFirmwareMethod === 'download' ? 'ghostesp' : 'manual';

                // --- Use extracted GhostESP data if available ---
                if (source === 'ghostesp' && extractedGhostEspFiles) {
                    espLoaderTerminal.writeLine("Using auto-loaded GhostESP files...");
                    for (const key in extractedGhostEspFiles) {
                        const fileInfo = extractedGhostEspFiles[key];
                        if (fileInfo.data) {
                            const flashAddress = parseInt(fileInfo.addressInput.value, 16);
                            // Convert ArrayBuffer to the binary string esptool.js expects
                            const uint8Data = new Uint8Array(fileInfo.data);
                            let binaryString = '';
                            for (let i = 0; i < uint8Data.length; i++) {
                                binaryString += String.fromCharCode(uint8Data[i]);
                            }
                            
                            fileArray.push({
                                data: binaryString,
                                address: flashAddress,
                                name: fileInfo.name, // Store name for progress reporting
                                type: fileInfo.type // Store type for offset check
                            });
                             espLoaderTerminal.writeLine(`Prepared ${fileInfo.name} for address 0x${flashAddress.toString(16)}`);
                        }
                    }
                }
                // --- Fallback to manual file inputs ---
                else {
                    espLoaderTerminal.writeLine("Using manually selected files...");
                for (const [inputElem, addressInput, fileType] of [
                    [appFileInput, appAddressInput, 'Application'],
                    [bootloaderFileInput, bootloaderAddressInput, 'Bootloader'],
                    [partitionFileInput, partitionAddressInput, 'Partition']
                ]) {
                        if (inputElem?.files?.length > 0) {
                        const file = inputElem.files[0];
                        const firmware = await file.arrayBuffer();
                        const flashAddress = parseInt(addressInput.value, 16);

                            // Convert ArrayBuffer to binary string
                        const uint8Data = new Uint8Array(firmware);
                        let binaryString = '';
                        for (let i = 0; i < uint8Data.length; i++) {
                            binaryString += String.fromCharCode(uint8Data[i]);
                        }

                            fileArray.push({
                            data: binaryString,
                            address: flashAddress,
                            name: file.name,
                            type: fileType,
                                size: uint8Data.length // Keep size if needed elsewhere?
                            });
                             espLoaderTerminal.writeLine(`Prepared ${file.name} for address 0x${flashAddress.toString(16)}`);
                        }
                    }
                }

                if (fileArray.length === 0) {
                     espLoaderTerminal.writeLine("❌ No firmware data found to flash.");
                     updateButtonStates();
                     return; 
                }

                fileArray.sort((a, b) => a.address - b.address);

                // --- Bootloader Offset Check (existing logic is fine) ---
                chipType = espLoader.chip.CHIP_NAME;
                 let correctBootloaderOffset = 0x1000; // Default for ESP32

                 // Determine correct offset based on chip type (add ESP32-C2 etc. if needed)
                if (chipType.includes("ESP32-S3") ||
                    chipType.includes("ESP32-C3") ||
                     chipType.includes("ESP32-C6") || 
                     chipType.includes("ESP32-H2") || 
                     chipType.includes("ESP32-C2")) { // Assuming C2/H2 also use 0x0
                    correctBootloaderOffset = 0x0;
                 } else if (chipType.includes("ESP32-P4") || chipType.includes("ESP32-C5")) { // User provided 0x2000
                      correctBootloaderOffset = 0x2000;
                }

                 // Apply correction if necessary
                 let offsetAdjusted = false;
                for (let i = 0; i < fileArray.length; i++) {
                    if (fileArray[i].type === 'Bootloader' &&
                        fileArray[i].address !== correctBootloaderOffset) {
                         espLoaderTerminal.writeLine(`⚠️ WARNING: Bootloader address 0x${fileArray[i].address.toString(16)} does not match expected offset 0x${correctBootloaderOffset.toString(16)} for ${chipType}. Adjusting.`);
                        fileArray[i].address = correctBootloaderOffset;
                         offsetAdjusted = true;
                    }
                }
                 if (offsetAdjusted) {
                     // Re-sort if addresses changed
                     fileArray.sort((a, b) => a.address - b.address);
                     espLoaderTerminal.writeLine("Re-sorted files after bootloader address correction.");
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
                        // Use the name stored in our fileArray object
                        const fileName = fileArray[fileIndex] ? fileArray[fileIndex].name : `File ${fileIndex + 1}`; 
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
            
            // Action buttons depend on method and files/connection
            // Call hasFirmwareFilesSelected safely here
            const canFlash = connected && hasFirmwareFilesSelected(); 
            if (flashButton) flashButton.disabled = !canFlash;
            if (eraseButton) eraseButton.disabled = !connected;
            if (resetButton) resetButton.disabled = !connected;
            
            // Connection settings
            if (baudrateSelect) baudrateSelect.disabled = connected;
            // if (resetMethodSelect) resetMethodSelect.disabled = connected;

            // Disable next step buttons based on state
            if (nextToStep3Button) nextToStep3Button.disabled = !connected;
            // Call hasFirmwareFilesSelected safely here
            if (nextToStep4Button) nextToStep4Button.disabled = !hasFirmwareFilesSelected(); 
        }
        
        // Check if WebSerial is supported
        if (!navigator.serial) {
            espLoaderTerminal.writeLine("WebSerial is not supported in this browser. Please use Chrome or Edge version 89 or later.");
            connectButton.disabled = true;
            
            // Create and show a modal popup with dark theme styling
            const modalCss = `
                <style>
                    #webSerialModal {
                        z-index: 10002 !important; /* Higher than loading overlay and eyes */
                    }
                    .modal-backdrop {
                        z-index: 10001 !important; /* Higher than eyes but below modal */
                    }
                </style>
            `;
            
            const modalHtml = `
            ${modalCss}
            <div class="modal fade" id="webSerialModal" tabindex="-1" aria-hidden="true" style="z-index: 10002;">
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

        // add a mapping for nice names (based on the provided yaml)
        const ghostEspNiceNames = {
            "esp32-generic.zip": "Generic ESP32",
            "esp32-generic.zip": "FlipperHub Rocket",
            "esp32s2-generic.zip": "Generic ESP32-S2",
            "esp32s3-generic.zip": "Generic ESP32-S3",
            "esp32c3-generic.zip": "Generic ESP32-C3",
            "esp32c6-generic.zip": "Generic ESP32-C6",
            "esp32c5-generic.zip": "Generic ESP32-C5",
            "esp32c5-generic-v01.zip": "Generic ESP32-C5 v01",
            "esp32v5_awok.zip": "Awok V5",
            "ghostboard.zip": "Rabbit Labs' GhostBoard",
            "MarauderV4_FlipperHub.zip": "Marauder V4 / FlipperHub",
            "MarauderV6_AwokDual.zip": "Marauder V6 / Awok Dual",
            "AwokMini.zip": "Awok Mini",
            "ESP32-S3-Cardputer.zip": "M5Stack Cardputer",
            "HeltecV3.zip": "Heltec V3",
            "CYD2USB.zip": "CYD2USB",
            "CYDMicroUSB.zip": "CYD MicroUSB",
            "CYDDualUSB.zip": "CYD Dual USB",
            "CYD2USB2.4Inch.zip": "CYD 2.4 Inch USB",
            "CYD2USB2.4Inch_C.zip": "CYD 2.4 Inch USB-C",
            "CYD2432S028R.zip": "CYD2432S028R",
            "Waveshare_LCD.zip": "Waveshare 7\" LCD",
            "Crowtech_LCD.zip": "Crowtech 7\" LCD",
            "Sunton_LCD.zip": "Sunton 7\" LCD",
            "JC3248W535EN_LCD.zip": "JC3248W535EN LCD",
            "Flipper_JCMK_GPS.zip": "Flipper Dev-Board w/ JCMK GPS",
            "LilyGo-T-Deck.zip": "LilyGo T-Deck",
            "LilyGo-TEmbedC1101.zip": "LilyGo TEmbedC1101",
            "LilyGo-S3TWatch-2020.zip": "LilyGo S3 T-Watch 2020",
            "LilyGo-TDisplayS3-Touch.zip": "LilyGo TDisplay S3 Touch",
            "RabbitLabs_Minion.zip": "Rabbit Labs' Minion",
            "JCMK_DevBoardPro.zip": "JCMK DevBoard Pro",
            "CardputerADV.zip": "Cardputer ADV",
            "Lolin_S3_Pro.zip": "Lolin S3 Pro",
            "Poltergeist.zip": "Rabbit-Labs Poltergeist",
            "Banshee_C5.zip": "Banshee C5",
            "Banshee_S3.zip": "Banshee S3"
        };

        // Mapping from build target (idf_target) to chip name used in 'selectedDevice'
        const ghostEspChipMapping = {
            "esp32": "ESP32",
            "esp32s2": "ESP32-S2",
            "esp32s3": "ESP32-S3",
            "esp32c3": "ESP32-C3",
            "esp32c6": "ESP32-C6",
            "esp32c5": "ESP32-C5"
            // Add other mappings if GhostESP supports more chips later
        };

        // This mapping helps link the zip name back to the target chip
        const ghostEspZipToTarget = {
            "esp32-generic.zip": "esp32",
            "esp32s2-generic.zip": "esp32s2",
            "esp32s3-generic.zip": "esp32s3",
            "esp32c3-generic.zip": "esp32c3",
            "esp32c5-generic.zip": "esp32c5",
            "esp32c5-generic-v01.zip": "esp32c5",
            "esp32c6-generic.zip": "esp32c6",
            "esp32v5_awok.zip": "esp32s2",
            "ghostboard.zip": "esp32c6",
            "MarauderV4_FlipperHub.zip": "esp32",
            "MarauderV6_AwokDual.zip": "esp32",
            "AwokMini.zip": "esp32s2",
            "ESP32-S3-Cardputer.zip": "esp32s3",
            "HeltecV3.zip": "esp32s3",
            "CYD2USB.zip": "esp32",
            "CYDMicroUSB.zip": "esp32",
            "CYDDualUSB.zip": "esp32",
            "CYD2USB2.4Inch.zip": "esp32",
            "CYD2USB2.4Inch_C.zip": "esp32",
            "CYD2432S028R.zip": "esp32",
            "Waveshare_LCD.zip": "esp32s3",
            "Crowtech_LCD.zip": "esp32s3",
            "Sunton_LCD.zip": "esp32s3",
            "JC3248W535EN_LCD.zip": "esp32s3",
            "Flipper_JCMK_GPS.zip": "esp32s2",
            "LilyGo-T-Deck.zip": "esp32s3",
            "LilyGo-TEmbedC1101.zip": "esp32s3",
            "LilyGo-S3TWatch-2020.zip": "esp32s3",
            "LilyGo-TDisplayS3-Touch.zip": "esp32s3",
            "JCMK_DevBoardPro.zip": "esp32",
            "RabbitLabs_Minion.zip": "esp32",
            "CardputerADV.zip": "esp32s3",
            "Lolin_S3_Pro.zip": "esp32s3",
            "Poltergeist.zip": "esp32c5",
            "Banshee_C5.zip": "esp32c5",
            "Banshee_S3.zip": "esp32s3"
        };

        // --- Helper function to populate assets into a parent element ---
        function populateAssets(assets, parentElement, fileExtension, filterChip, repo) {
            let foundFiles = false;
            if (!assets || assets.length === 0) {
                 return false; // No assets to process
            }

            assets.forEach(asset => {
                if (asset.name.endsWith(fileExtension)) {
                    // --- Filtering Logic for GhostESP ---
                    if (repo === 'Ghost_ESP' && filterChip) {
                        const assetTarget = ghostEspZipToTarget[asset.name];
                        const mappedChip = ghostEspChipMapping[assetTarget];
                        if (mappedChip !== filterChip) {
                            return; // Skip this asset if it doesn't match the selected chip
                        }
                    }
                    // --- End Filtering Logic ---

                    // --- Special Handling for esp32-generic.zip ---
                    if (repo === 'Ghost_ESP' && asset.name === "esp32-generic.zip") {
                        // Manually create both options for this specific ZIP
                        const option1 = document.createElement('option');
                        option1.value = asset.browser_download_url;
                        option1.textContent = "Generic ESP32";
                        parentElement.appendChild(option1);

                        const option2 = document.createElement('option');
                        option2.value = asset.browser_download_url;
                        option2.textContent = "FlipperHub Rocket"; // Use the second name
                        parentElement.appendChild(option2);

                        foundFiles = true;
                        return; // Skip the default processing below for this asset
                    }
                    // --- End Special Handling ---

                    // --- Special Handling for CYD2USB2.4Inch.zip ---
                    if (repo === 'Ghost_ESP' && asset.name === "CYD2USB2.4Inch.zip") {
                        const option1 = document.createElement('option');
                        option1.value = asset.browser_download_url;
                        option1.textContent = "CYD 2.4 Inch USB (ESP32)";
                        parentElement.appendChild(option1);

                        const option2 = document.createElement('option');
                        option2.value = asset.browser_download_url;
                        option2.textContent = "Rabbit Labs' Phantom";
                        parentElement.appendChild(option2);

                        foundFiles = true;
                        return;
                    }
                    // --- End Special Handling ---

                    // --- Default processing for other assets ---
                    foundFiles = true;
                    const option = document.createElement('option');
                    option.value = asset.browser_download_url;

                    // Use nice name if available for GhostESP, otherwise use asset name
                    option.textContent = (repo === 'Ghost_ESP' && ghostEspNiceNames[asset.name])
                                         ? ghostEspNiceNames[asset.name]
                                         : asset.name;

                    parentElement.appendChild(option);
                }
            });
            return foundFiles;
        }

        async function populateRepoOptions(owner, repo, selectElementId, fileExtension = '.zip', defaultOptionText = '-- Select an option --', filterChip = null) {
            const selectElement = getElementById(selectElementId);
            if (!selectElement) {
                console.error(`Select element with ID '${selectElementId}' not found.`);
                return;
            }

            selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
            selectElement.disabled = true;

            try {
                const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`; // Fetch all releases
                espLoaderTerminal.writeLine(`Fetching releases from ${owner}/${repo}...`);
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
                }
                const releases = await response.json();
                if (!releases || releases.length === 0) {
                    espLoaderTerminal.writeLine(`⚠️ No releases found for ${owner}/${repo}.`);
                    selectElement.innerHTML = `<option value="">No releases found</option>`;
                    return;
                }

                // find the latest stable and pre-release
                let latestStableRelease = null;
                let latestPrerelease = null;
                for (const release of releases) {
                    if (!release.prerelease && !latestStableRelease) {
                        latestStableRelease = release;
                    }
                    if (release.prerelease && !latestPrerelease) {
                        latestPrerelease = release;
                    }
                     // optimization: stop if we found both
                     if (latestStableRelease && latestPrerelease) break; 
                }

                let optionsAdded = false;

                // populate stable release
                if (latestStableRelease) {
                    const stableOptgroup = document.createElement('optgroup');
                    stableOptgroup.label = `Stable Release (${latestStableRelease.tag_name})`;
                    if (populateAssets(latestStableRelease.assets, stableOptgroup, fileExtension, filterChip, repo)) {
                        selectElement.appendChild(stableOptgroup);
                        optionsAdded = true;
                         espLoaderTerminal.writeLine(`Found stable release: ${latestStableRelease.tag_name}`);
                    } else {
                         espLoaderTerminal.writeLine(`Stable release ${latestStableRelease.tag_name} found, but no matching assets.`);
                    }
                } else {
                    espLoaderTerminal.writeLine(`No stable release found for ${owner}/${repo}.`);
                }

                // populate pre-release
                if (latestPrerelease) {
                    const prereleaseOptgroup = document.createElement('optgroup');
                    prereleaseOptgroup.label = `Pre-release (${latestPrerelease.tag_name})`;
                     if (populateAssets(latestPrerelease.assets, prereleaseOptgroup, fileExtension, filterChip, repo)) {
                        selectElement.appendChild(prereleaseOptgroup);
                        optionsAdded = true;
                        espLoaderTerminal.writeLine(`Found pre-release: ${latestPrerelease.tag_name}`);
                     } else {
                         espLoaderTerminal.writeLine(`Pre-release ${latestPrerelease.tag_name} found, but no matching assets.`);
                     }
                } else {
                    espLoaderTerminal.writeLine(`No pre-release found for ${owner}/${repo}.`);
                }

                if (!optionsAdded) {
                    let message = `No suitable ${fileExtension} assets found`;
                    if (repo === 'Ghost_ESP' && filterChip) {
                        message += ` for the selected chip (${filterChip})`;
                    }
                     message += ` in the latest stable or pre-releases for ${owner}/${repo}.`;
                     espLoaderTerminal.writeLine(`⚠️ ${message}`);
                     selectElement.innerHTML = `<option value="">${message}</option>`; // Keep disabled
                } else {
                     selectElement.disabled = false;
                }

            } catch (error) {
                 console.error(`Error fetching ${repo} data:`, error);
                 espLoaderTerminal.writeLine(`⚠️ Failed to fetch ${repo} list: ${error.message}`);
                 selectElement.innerHTML = `<option value="">Error loading options</option>`;
            }
        }

        // new function to populate ghostesp dropdown based on toggle state
        async function populateGhostEspDropdown(owner, repo, fileExtension = '.zip', filterChip = null) {
            const selectElement = ghostEspVariantSelect;
            if (!selectElement) {
                console.error('GhostESP select element not found');
                return;
            }

            selectElement.innerHTML = `<option value="">Select a build...</option>`;
            selectElement.disabled = true;

            try {
                // only fetch if we don't have cached data
                if (!ghostEspStableReleases && !ghostEspPrereleases) {
                    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
                    espLoaderTerminal.writeLine(`Fetching releases from ${owner}/${repo}...`);
                    const response = await fetch(apiUrl);
                    if (!response.ok) {
                        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
                    }
                    const releases = await response.json();
                    if (!releases || releases.length === 0) {
                        espLoaderTerminal.writeLine(`⚠️ No releases found for ${owner}/${repo}.`);
                        selectElement.innerHTML = `<option value="">No releases found</option>`;
                        return;
                    }

                    // find and cache the latest stable and pre-release
                    for (const release of releases) {
                        if (!release.prerelease && !ghostEspStableReleases) {
                            ghostEspStableReleases = release;
                        }
                        if (release.prerelease && !ghostEspPrereleases) {
                            ghostEspPrereleases = release;
                        }
                        if (ghostEspStableReleases && ghostEspPrereleases) break;
                    }
                }

                // populate based on current toggle state
                const targetRelease = ghostEspReleaseType === 'stable' ? ghostEspStableReleases : ghostEspPrereleases;
                
                if (targetRelease) {
                    if (populateAssets(targetRelease.assets, selectElement, fileExtension, filterChip, repo)) {
                        selectElement.disabled = false;
                        espLoaderTerminal.writeLine(`Loaded ${ghostEspReleaseType} release: ${targetRelease.tag_name}`);
                    } else {
                        espLoaderTerminal.writeLine(`${ghostEspReleaseType} release ${targetRelease.tag_name} found, but no matching assets.`);
                        selectElement.innerHTML = `<option value="">No matching assets found</option>`;
                    }
                } else {
                    espLoaderTerminal.writeLine(`No ${ghostEspReleaseType} release found for ${owner}/${repo}.`);
                    selectElement.innerHTML = `<option value="">No ${ghostEspReleaseType} release found</option>`;
                }

            } catch (error) {
                console.error(`Error fetching ${repo} data:`, error);
                espLoaderTerminal.writeLine(`⚠️ Failed to fetch ${repo} list: ${error.message}`);
                selectElement.innerHTML = `<option value="">Error loading options</option>`;
            }
        }

        // --- NEW FUNCTION: Load and process GhostESP ZIP ---
        async function loadGhostEspZip(zipUrl) {
            console.log(`[Debug] loadGhostEspZip called with original URL: ${zipUrl}`); // Log original URL
            if (!zipUrl) {
                console.log('[Debug] loadGhostEspZip: No URL provided, clearing data.'); 
                extractedGhostEspFiles = null; 
                updateBinaryTypeIndicators(); 
                updateFlashSummary(); 
                updateButtonStates();
                return;
            }

            // --- Use YOUR Cloudflare Worker Proxy ---
            // const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(zipUrl)}`; // OLD
            const proxyUrl = `https://fragrant-flower-ba0b.creepersbeast.workers.dev/?url=${encodeURIComponent(zipUrl)}`; // UPDATED with your worker URL
            console.log(`[Debug] Using CF Worker proxy URL: ${proxyUrl}`); // Log proxy URL
            espLoaderTerminal.writeLine(`Fetching GhostESP firmware via proxy from ${zipUrl}...`);
            
            if (ghostEspVariantSelect) ghostEspVariantSelect.disabled = true;

            extractedGhostEspFiles = null; 

            try {
                console.log('[Debug] loadGhostEspZip: Starting fetch via proxy...'); 
                // --- Fetch using the proxy URL ---
                const response = await fetch(proxyUrl); 
                console.log(`[Debug] loadGhostEspZip: Fetch response status: ${response.status}, ok: ${response.ok}`); 
                
                // Check if the proxy itself had an issue or if the proxied request failed
                if (!response.ok) {
                    // Try to get error details from the proxy response if available
                    let proxyErrorDetails = `Proxy fetch failed with status: ${response.status}`;
                    try {
                        const errorText = await response.text();
                         // AllOrigins might return JSON with error details
                         try {
                             const errorJson = JSON.parse(errorText);
                             if (errorJson.contents && errorJson.status?.http_code) {
                                 proxyErrorDetails = `Proxied request failed: ${errorJson.status.http_code}. ${errorJson.contents}`;
                             } else {
                                 proxyErrorDetails += `. Response: ${errorText.substring(0, 200)}`; // Limit length
                             }
                         } catch (parseError) {
                              proxyErrorDetails += `. Response: ${errorText.substring(0, 200)}`; // Limit length
                         }
                    } catch (e) { /* Ignore errors reading body */ }
                     console.error(`[Debug] Proxy fetch error: ${proxyErrorDetails}`);
                     throw new Error(proxyErrorDetails); 
                }
                
                const zipBlob = await response.blob();
                console.log(`[Debug] loadGhostEspZip: Downloaded Blob size: ${zipBlob.size}`); 
                if (zipBlob.size === 0) {
                    throw new Error("Downloaded ZIP file is empty. Proxy or original link might be broken.");
                }
                 // Check Blob type - should be application/zip or octet-stream generally
                 console.log(`[Debug] loadGhostEspZip: Downloaded Blob type: ${zipBlob.type}`);
                 if (zipBlob.type && !zipBlob.type.includes('zip') && !zipBlob.type.includes('octet-stream') && !zipBlob.type.includes('binary')) {
                     // Suspicious type, might be an error page from the proxy or GitHub
                     try {
                         const errorText = await zipBlob.text();
                         console.warn(`[Debug] Suspicious blob type. Content preview: ${errorText.substring(0, 200)}`);
                         // You might want to throw a more specific error here depending on content
                     } catch (e) { /* Ignore */}
                 }

                espLoaderTerminal.writeLine(`Downloaded ${Math.round(zipBlob.size / 1024)} KB ZIP. Extracting...`);

                console.log('[Debug] loadGhostEspZip: Loading ZIP with JSZip...'); 
                const zip = await JSZip.loadAsync(zipBlob);
                console.log('[Debug] loadGhostEspZip: JSZip loaded successfully.'); 
                
                // --- Files to extract ---
                const filesToExtract = {
                    app: { name: 'Ghost_ESP_IDF.bin', data: null, elem: appFileInfoElem, addressInput: appAddressInput, type: 'Application' }, // Corrected name
                    bootloader: { name: 'bootloader.bin', data: null, elem: bootloaderFileInfoElem, addressInput: bootloaderAddressInput, type: 'Bootloader' }, // Seems correct
                    partition: { name: 'partition-table.bin', data: null, elem: partitionFileInfoElem, addressInput: partitionAddressInput, type: 'Partition' } // Corrected name
                };

                let foundCount = 0;
                console.log('[Debug] loadGhostEspZip: Starting file extraction loop...'); 
                for (const key in filesToExtract) {
                    const target = filesToExtract[key];
                    console.log(`[Debug] loadGhostEspZip: Checking for file: ${target.name}`);
                    
                    // Try the primary name first
                    let fileEntry = zip.file(target.name);
                    
                    // If not found, try alternative names for specific file types
                    if (!fileEntry) {
                        if (key === 'app') {
                            fileEntry = zip.file('firmware.bin');
                            if (fileEntry) target.name = 'firmware.bin';
                        } else if (key === 'partition') {
                            fileEntry = zip.file('partitions.bin');
                            if (fileEntry) target.name = 'partitions.bin';
                        }
                    }
                    
                    if (fileEntry) {
                        console.log(`[Debug] loadGhostEspZip: Found ${target.name}, extracting data...`);
                        target.data = await fileEntry.async("arraybuffer");
                        const fileSizeKB = Math.round(target.data.byteLength / 1024);
                         console.log(`[Debug] loadGhostEspZip: Extracted ${target.name}, size: ${fileSizeKB} KB. Updating UI...`); 
                        if (target.elem) {
                             target.elem.textContent = `${target.name} (${fileSizeKB} KB) [Auto-Loaded]`;
                             const dropZone = target.elem.closest('.firmware-section')?.querySelector('.custom-file-upload');
                             dropZone?.classList.add('file-uploaded'); 
                        }
                        espLoaderTerminal.writeLine(`Found ${target.name} (${fileSizeKB} KB)`);
                        foundCount++;
                    } else {
                         console.log(`[Debug] loadGhostEspZip: File not found in ZIP: ${target.name}`); 
                         if (target.elem) {
                            target.elem.textContent = 'Not found in ZIP';
                             const dropZone = target.elem.closest('.firmware-section')?.querySelector('.custom-file-upload');
                             dropZone?.classList.remove('file-uploaded'); // Remove uploaded class if file not found
                         }
                         espLoaderTerminal.writeLine(`Warning: ${target.name} not found in the ZIP.`);
                    }
                }
                console.log(`[Debug] loadGhostEspZip: Extraction loop finished. Found count: ${foundCount}`); 

                if (foundCount > 0) {
                     extractedGhostEspFiles = filesToExtract; 
                     espLoaderTerminal.writeLine("Extraction complete. Files ready.");
                     updateBinaryTypeIndicators(); 
                     updateFlashSummary(); 
                } else {
                    // If we downloaded something but didn't find the files, clear UI state
                     clearExtractedData(); 
                     updateFlashSummary();
                    throw new Error("No required .bin files found in the downloaded ZIP.");
                }

            } catch (error) {
                console.error("[Debug] Error loading or extracting GhostESP ZIP:", error); 
                espLoaderTerminal.writeLine(`❌ Error processing GhostESP ZIP: ${error.message}`);
                extractedGhostEspFiles = null; 
                 if (appFileInfoElem) appFileInfoElem.textContent = 'ZIP Load Failed';
                 if (bootloaderFileInfoElem) bootloaderFileInfoElem.textContent = 'ZIP Load Failed';
                 if (partitionFileInfoElem) partitionFileInfoElem.textContent = 'ZIP Load Failed';
                 document.querySelectorAll('.custom-file-upload.file-uploaded').forEach(el => el.classList.remove('file-uploaded'));
                 updateBinaryTypeIndicators(); // Clear badges on error
            } finally {
                console.log('[Debug] loadGhostEspZip: Finally block reached. Re-enabling select.');
                 if (ghostEspVariantSelect) ghostEspVariantSelect.disabled = false;
                updateButtonStates();
            }
        }

        // --- Modify setupDownloadLinkListener to handle the GhostESP case ---
        function setupDownloadLinkListener(selectElement, linkElement) {
            if (selectElement) {
                selectElement.addEventListener('change', () => {
                    const selectedValue = selectElement.value;
                    console.log(`[Debug] Select changed for ID: ${selectElement.id}, Value: ${selectedValue}`);

                    // ghostesp special handling
                    if (selectElement.id === 'ghostEspVariantSelect') {
                        console.log('[Debug] GhostESP variant selected, attempting load...');
                        
                        // trigger the load function
                        loadGhostEspZip(selectedValue); 
                    
                    // default handling (marauder, etc.)
                    } else if (linkElement) {
                        console.log('[Debug] Non-GhostESP select changed.');
                        if (selectedValue) {
                            linkElement.href = selectedValue;
                        linkElement.classList.remove('disabled');
                        linkElement.classList.replace('btn-secondary', 'btn-primary');
                    } else {
                        linkElement.href = '#';
                        linkElement.classList.add('disabled');
                        linkElement.classList.replace('btn-primary', 'btn-secondary');
                        }
                    }
                });
            } else {
                 console.error(`[Debug] setupDownloadLinkListener: Missing selectElement for ID: ${selectElement?.id}`);
            }
        }

        // setup listener for ghostesp dropdown
        setupDownloadLinkListener(ghostEspVariantSelect, null);
        
        // keep the early call for marauder as its section might be simpler
        setupDownloadLinkListener(marauderVariantSelect, marauderDownloadLink); 

        // --- THIS BLOCK IS THE CULPRIT - Commenting it out ---
        /*
        if (firmwareSourceSelect) { 
            firmwareSourceSelect.addEventListener('change', () => { 
                const selectedSource = firmwareSourceSelect.value;
                console.log(`[Debug] Firmware source changed to: ${selectedSource}`); // <<< ADD LOG

                // Reset file inputs AND extracted data if switching away from manual/ghost
                 if (selectedSource !== 'manual') {
                     clearManualInputs(); // Use a helper for clarity
                 }
                 if (selectedSource !== 'ghostesp') {
                     clearExtractedData(); // Clear extracted data if switching away from ghost
                 }


                const allDownloadSections = [ghostEspDownloadSection, marauderDownloadSection];
                // Remove download links logic as GhostESP doesn't use it now
                // const allDownloadLinks = [ghostEspDownloadLink, marauderDownloadLink]; 

                manualUploadSection.classList.add('d-none');
                allDownloadSections.forEach(section => section?.classList.add('d-none'));
                // Clear link states (only marauder needs it now)
                 if (marauderDownloadLink) {
                     marauderDownloadLink.href = '#';
                     marauderDownloadLink.classList.add('disabled');
                     marauderDownloadLink.classList.replace('btn-primary', 'btn-secondary');
                 }


                if (selectedSource === 'manual') {
                     console.log('[Debug] Source is manual, showing manual section.'); // <<< ADD LOG
                    manualUploadSection.classList.remove('d-none');
                } else if (selectedSource === 'ghostesp') {
                     console.log('[Debug] Source is ghostesp, showing section and populating options...');
                    ghostEspDownloadSection?.classList.remove('d-none');
                    populateGhostEspDropdown('Spooks4576', 'Ghost_ESP', '.zip', selectedDevice)
                        .catch(err => {
                            console.error('[Debug] Error during populateGhostEspDropdown:', err);
                        });
                } else if (selectedSource === 'marauder') {
                     console.log('[Debug] Source is marauder, showing section and populating options...'); // <<< ADD LOG
                    marauderDownloadSection?.classList.remove('d-none');
                    // Assuming Marauder doesn't need the listener moved, but could add .then() if needed
                    populateRepoOptions('justcallmekoko', 'ESP32Marauder', 'marauderVariantSelect', '.bin', '-- Select a Marauder BIN... --');
                }
                
                updateFlashSummary(); // Update summary after source change
                updateButtonStates(); // Update buttons after source change
            });

            // Trigger change on load IF a device is already selected maybe?
            // Or just let manual be default.
             console.log('[Debug] Dispatching initial change event for firmwareSourceSelect'); // <<< ADD LOG
            firmwareSourceSelect.dispatchEvent(new Event('change')); 
        } 
        */ // <<< --- End of commented out block ---

        // --- Helper to clear manual file inputs ---
        function clearManualInputs() {
             if (appFileInput) appFileInput.value = '';
             if (bootloaderFileInput) bootloaderFileInput.value = '';
             if (partitionFileInput) partitionFileInput.value = '';
             if(appFileInfoElem) appFileInfoElem.textContent = 'No file selected';
             if(bootloaderFileInfoElem) bootloaderFileInfoElem.textContent = 'No file selected';
             if(partitionFileInfoElem) partitionFileInfoElem.textContent = 'No file selected';
             // Clear visual indicators too
             document.querySelectorAll('.custom-file-upload.file-uploaded').forEach(el => el.classList.remove('file-uploaded'));
             updateBinaryTypeIndicators();
        }

        // --- Helper to clear extracted data ---
        function clearExtractedData() {
            if (extractedGhostEspFiles) {
                // Clear the stored data
                extractedGhostEspFiles = null; 
                // Optionally clear the UI text if it was set by extraction
                // Check if the current text indicates it was auto-loaded before clearing
                if (appFileInfoElem?.textContent.includes('[Auto-Loaded]')) appFileInfoElem.textContent = 'No file selected';
                if (bootloaderFileInfoElem?.textContent.includes('[Auto-Loaded]')) bootloaderFileInfoElem.textContent = 'No file selected';
                if (partitionFileInfoElem?.textContent.includes('[Auto-Loaded]')) partitionFileInfoElem.textContent = 'No file selected';
                // Clear visual indicators 
                document.querySelectorAll('.custom-file-upload.file-uploaded').forEach(el => el.classList.remove('file-uploaded'));
                updateBinaryTypeIndicators(); 
                espLoaderTerminal.writeLine("Cleared auto-loaded GhostESP files.");
            }
        }

        // --- Modify updateBinaryTypeIndicators to check extracted data ---
        function updateBinaryTypeIndicators() {
            // Clear existing badges first
            document.querySelectorAll('.file-badge').forEach(badge => badge.remove());
            
            // FIX: Use selectedFirmwareMethod instead of the removed firmwareSourceSelect
            // const source = firmwareSourceSelect.value; 
            const method = selectedFirmwareMethod; // Use the current method variable

            let hasApp = false, hasBootloader = false, hasPartition = false;

            // Check based on the selected method
            if (method === 'download' && extractedGhostEspFiles) { 
                hasApp = !!extractedGhostEspFiles.app.data;
                hasBootloader = !!extractedGhostEspFiles.bootloader.data;
                hasPartition = !!extractedGhostEspFiles.partition.data;
            } else if (method === 'manual') { // Check the manual method
                 hasApp = appFileInput?.files?.length > 0;
                 hasBootloader = bootloaderFileInput?.files?.length > 0;
                 hasPartition = partitionFileInput?.files?.length > 0;
            }

            if (hasApp) {
                const appButton = document.querySelector('[data-binary="app"]');
                appButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
            if (hasBootloader) {
                const bootloaderButton = document.querySelector('[data-binary="bootloader"]');
                 bootloaderButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
            if (hasPartition) {
                const partitionButton = document.querySelector('[data-binary="partition"]');
                 partitionButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
        }

        // --- NEW: Event Listeners for Primary Choice Cards ---
        if (choiceDownloadCard) {
            choiceDownloadCard.addEventListener('click', () => {
                selectFirmwareMethod('download');
            });
        }
        if (choiceManualCard) {
            choiceManualCard.addEventListener('click', () => {
                selectFirmwareMethod('manual');
            });
        }

        function selectFirmwareMethod(method) {
            selectedFirmwareMethod = method;

            // Update button appearance
            choiceDownloadCard?.classList.toggle('active', method === 'download');
            choiceManualCard?.classList.toggle('active', method === 'manual');

            // Show/hide relevant containers
            downloadOptionsContainer?.classList.toggle('d-none', method !== 'download');
            manualUploadContainer?.classList.toggle('d-none', method !== 'manual');
            
            // Reset state if switching
            if (method === 'download') {
                clearManualInputs(); 
                 if (downloadSourceSelect) downloadSourceSelect.value = ''; 
                 ghostEspDownloadSection?.classList.add('d-none');
                 marauderDownloadSection?.classList.add('d-none');
            } else {
                clearExtractedData();
                 if (downloadSourceSelect) downloadSourceSelect.value = ''; 
                 ghostEspDownloadSection?.classList.add('d-none');
                 marauderDownloadSection?.classList.add('d-none');
                 document.querySelector('.binary-type-toggle .btn[data-binary="app"]')?.click();
            }
            
            updateFlashSummary();
            updateButtonStates();
        }
        
        // Initialize with download selected by default
        selectFirmwareMethod('download');

        // --- NEW: Event Listener for Download Source Selection ---
        if (downloadSourceSelect) {
            downloadSourceSelect.addEventListener('change', () => {
                const selectedSource = downloadSourceSelect.value;
                console.log(`[Debug] Download source selected: ${selectedSource}`);

                // Hide both subsections initially
                ghostEspDownloadSection?.classList.add('d-none');
                marauderDownloadSection?.classList.add('d-none');
                 if (ghostEspStatusElem) { // Reset GhostESP status text
                     ghostEspStatusElem.textContent = 'Select a variant to begin loading firmware files.';
                     ghostEspStatusElem.className = 'form-text text-muted mt-2'; // Reset class
                 }
                 clearExtractedData(); // Clear any previously loaded Ghost files

                if (selectedSource === 'ghostesp') {
                    console.log('[Debug] Showing GhostESP section and populating options...');
                    ghostEspDownloadSection?.classList.remove('d-none');
                    populateGhostEspDropdown('jaylikesbunda', 'Ghost_ESP', '.zip', selectedDevice)
                        .catch(err => {
                            console.error('[Debug] Error populating GhostESP options:', err);
                            if (ghostEspStatusElem) {
                                ghostEspStatusElem.textContent = 'Error loading variants from GitHub.';
                                ghostEspStatusElem.className = 'form-text text-danger mt-2 error';
                             }
                        });
                } else if (selectedSource === 'marauder') {
                    console.log('[Debug] Showing Marauder section and populating options...');
                    marauderDownloadSection?.classList.remove('d-none');
                    populateRepoOptions('justcallmekoko', 'ESP32Marauder', 'marauderVariantSelect', '.bin', '-- Select Marauder Binary --')
                        .then(() => {
                             console.log('[Debug] Populated Marauder options.');
                             // Listener for Marauder download link is already attached (or should be)
                             // setupDownloadLinkListener(marauderVariantSelect, marauderDownloadLink); // Already called earlier
                        })
                         .catch(err => {
                             console.error('[Debug] Error populating Marauder options:', err);
                             // Add error feedback for Marauder if needed
                         });
                }
                updateFlashSummary(); // Update summary in case selection changes things
                updateButtonStates();
            });
        }

        // --- Event Listeners for GhostESP Release Toggle ---
        const releaseToggleBtns = document.querySelectorAll('.release-toggle-btn');
        releaseToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const releaseType = btn.getAttribute('data-release');
                console.log(`[Debug] Release toggle clicked: ${releaseType}`);
                
                // update toggle button states
                releaseToggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // update global state
                ghostEspReleaseType = releaseType;
                
                // clear current selection
                if (ghostEspVariantSelect) {
                    ghostEspVariantSelect.selectedIndex = 0;
                }
                
                // clear extracted data when switching
                clearExtractedData();
                
                // repopulate dropdown with new release type
                if (ghostEspDownloadSection && !ghostEspDownloadSection.classList.contains('d-none')) {
                    populateGhostEspDropdown('jaylikesbunda', 'Ghost_ESP', '.zip', selectedDevice)
                        .catch(err => {
                            console.error('[Debug] Error repopulating GhostESP after toggle:', err);
                        });
                }
            });
        });


        // --- Modify loadGhostEspZip to update status element ---
        async function loadGhostEspZip(zipUrl) {
            console.log(`[Debug] loadGhostEspZip called with original URL: ${zipUrl}`); 
            if (!zipUrl) {
                // ... (rest of the condition)
                 if (ghostEspStatusElem) {
                     ghostEspStatusElem.textContent = 'Select a variant to begin loading firmware files.';
                     ghostEspStatusElem.className = 'form-text text-muted mt-2';
                 }
                return;
            }

            // --- Update Status UI ---
             if (ghostEspStatusElem) {
                 ghostEspStatusElem.textContent = 'Fetching ZIP from GitHub...';
                 ghostEspStatusElem.className = 'form-text mt-2 loading'; // Add loading class
             }

            const proxyUrl = `https://fragrant-flower-ba0b.creepersbeast.workers.dev/?url=${encodeURIComponent(zipUrl)}`;
            console.log(`[Debug] Using CF Worker proxy URL: ${proxyUrl}`); 
            espLoaderTerminal.writeLine(`Fetching GhostESP firmware via proxy from ${zipUrl}...`);
            
            if (ghostEspVariantSelect) ghostEspVariantSelect.disabled = true; 
            extractedGhostEspFiles = null; 

            try {
                console.log('[Debug] loadGhostEspZip: Starting fetch via proxy...'); 
                const response = await fetch(proxyUrl); 
                console.log(`[Debug] loadGhostEspZip: Fetch response status: ${response.status}, ok: ${response.ok}`); 
                
                if (!response.ok) {
                    // ... (error handling)
                     if (ghostEspStatusElem) {
                         ghostEspStatusElem.textContent = `Error fetching: ${response.status}`;
                         ghostEspStatusElem.className = 'form-text text-danger mt-2 error';
                     }
                     throw new Error(proxyErrorDetails); 
                }
                
                 if (ghostEspStatusElem) ghostEspStatusElem.textContent = 'Download complete. Extracting files...';

                const zipBlob = await response.blob();
                // ... (blob size/type checks) ...
                
                espLoaderTerminal.writeLine(`Downloaded ${Math.round(zipBlob.size / 1024)} KB ZIP. Extracting...`);

                console.log('[Debug] loadGhostEspZip: Loading ZIP with JSZip...'); 
                const zip = await JSZip.loadAsync(zipBlob);
                console.log('[Debug] loadGhostEspZip: JSZip loaded successfully.'); 
                
                const filesToExtract = { // Corrected filenames
                    app: { name: 'Ghost_ESP_IDF.bin', data: null, elem: appFileInfoElem, addressInput: appAddressInput, type: 'Application' }, 
                    bootloader: { name: 'bootloader.bin', data: null, elem: bootloaderFileInfoElem, addressInput: bootloaderAddressInput, type: 'Bootloader' }, 
                    partition: { name: 'partition-table.bin', data: null, elem: partitionFileInfoElem, addressInput: partitionAddressInput, type: 'Partition' } 
                };

                let foundCount = 0;
                let foundFilesLog = []; // To log which files were found
                console.log('[Debug] loadGhostEspZip: Starting file extraction loop...'); 
                for (const key in filesToExtract) {
                    const target = filesToExtract[key];
                    console.log(`[Debug] loadGhostEspZip: Checking for file: ${target.name}`);
                    
                    // Try the primary name first
                    let fileEntry = zip.file(target.name);
                    
                    // If not found, try alternative names for specific file types
                    if (!fileEntry) {
                        if (key === 'app') {
                            fileEntry = zip.file('firmware.bin');
                            if (fileEntry) target.name = 'firmware.bin';
                        } else if (key === 'partition') {
                            fileEntry = zip.file('partitions.bin');
                            if (fileEntry) target.name = 'partitions.bin';
                        }
                    }
                    
                    if (fileEntry) {
                        console.log(`[Debug] loadGhostEspZip: Found ${target.name}, extracting data...`);
                        target.data = await fileEntry.async("arraybuffer");
                        const fileSizeKB = Math.round(target.data.byteLength / 1024);
                         console.log(`[Debug] loadGhostEspZip: Extracted ${target.name}, size: ${fileSizeKB} KB. Updating UI...`); 
                        if (target.elem) {
                            target.elem.textContent = `${target.name} [Auto-Loaded]`;
                            document.querySelector(`label[for="${target.elem.id.replace('Info', '')}"]`)?.classList.add('file-uploaded');
                        }
                        foundFilesLog.push(target.name);
                        foundCount++;
                    } else {
                        console.log(`[Debug] loadGhostEspZip: ${target.name} not found in ZIP.`);
                        if (target.elem) {
                            target.elem.textContent = `${target.name} [Not Found]`;
                            document.querySelector(`label[for="${target.elem.id.replace('Info', '')}"]`)?.classList.remove('file-uploaded');
                        }
                    }
                }
                console.log(`[Debug] loadGhostEspZip: Extraction loop finished. Found count: ${foundCount}`); 

                if (foundCount > 0) {
                     extractedGhostEspFiles = filesToExtract; 
                     espLoaderTerminal.writeLine("Extraction complete. Files ready.");
                      if (ghostEspStatusElem) { // Update status on success
                          ghostEspStatusElem.textContent = `Loaded: ${foundFilesLog.join(', ')}`;
                          ghostEspStatusElem.className = 'form-text text-success mt-2 success';
                      }
                     updateBinaryTypeIndicators(); 
                     updateFlashSummary(); 
                } else {
                     clearExtractedData(); 
                     updateFlashSummary();
                      if (ghostEspStatusElem) { // Update status on failure
                         ghostEspStatusElem.textContent = 'Error: No required .bin files found in ZIP.';
                         ghostEspStatusElem.className = 'form-text text-danger mt-2 error';
                     }
                    throw new Error("No required .bin files found in the downloaded ZIP.");
                }

            } catch (error) {
                console.error("[Debug] Error loading or extracting GhostESP ZIP:", error); 
                espLoaderTerminal.writeLine(`❌ Error processing GhostESP ZIP: ${error.message}`);
                 if (ghostEspStatusElem) { // Update status on catch
                     ghostEspStatusElem.textContent = `Error: ${error.message}`;
                     ghostEspStatusElem.className = 'form-text text-danger mt-2 error';
                 }
                extractedGhostEspFiles = null; 
                 if (appFileInfoElem) appFileInfoElem.textContent = 'ZIP Load Failed';
                 if (bootloaderFileInfoElem) bootloaderFileInfoElem.textContent = 'ZIP Load Failed';
                 if (partitionFileInfoElem) partitionFileInfoElem.textContent = 'ZIP Load Failed';
                 document.querySelectorAll('.custom-file-upload.file-uploaded').forEach(el => el.classList.remove('file-uploaded'));
                 updateBinaryTypeIndicators(); // Clear badges on error
            } finally {
                console.log('[Debug] loadGhostEspZip: Finally block reached. Re-enabling select.');
                 if (ghostEspVariantSelect) ghostEspVariantSelect.disabled = false;
                updateButtonStates();
            }
        }

        // --- Modify setupDownloadLinkListener ---
        // Listener for Marauder should still work
        // Listener for GhostESP is now attached *after* populateRepoOptions finishes in the downloadSourceSelect listener
        function setupDownloadLinkListener(selectElement, linkElement) {
             // Refined check: selectElement is always required.
             // linkElement is only required if it's NOT the GhostESP select.
             if (!selectElement) {
                 console.error(`[Debug] setupDownloadLinkListener: Missing selectElement!`);
                 return;
             }
             if (selectElement.id !== 'ghostEspVariantSelect' && !linkElement) { 
                 console.error(`[Debug] setupDownloadLinkListener: Missing linkElement for Select: ${selectElement.id}`);
                 return;
             }
             // If it IS ghostEspVariantSelect, linkElement can be null, so we proceed.

            // Remove previous listener if any, to avoid duplicates when re-attaching

            selectElement.addEventListener('change', () => {
                const selectedValue = selectElement.value;
                console.log(`[Debug] Select changed for ID: ${selectElement.id}, Value: ${selectedValue}`); 

                // --- GhostESP Special Handling ---
                if (selectElement.id === 'ghostEspVariantSelect') {
                    console.log('[Debug] GhostESP variant selected, attempting load...'); 
                    // Remove lines trying to modify the null linkElement for GhostESP
                    // linkElement.href = '#'; // REMOVED
                    // linkElement.classList.add('disabled'); // REMOVED
                    // linkElement.classList.replace('btn-primary', 'btn-secondary'); // REMOVED
                    loadGhostEspZip(selectedValue); 
                // --- Default Handling (Marauder) ---
                } else if (selectElement.id === 'marauderVariantSelect') { // Be specific
                    console.log('[Debug] Marauder select changed.'); 
                    if (selectedValue) {
                        linkElement.href = selectedValue;
                        linkElement.classList.remove('disabled');
                        linkElement.classList.replace('btn-secondary', 'btn-primary');
                    } else {
                        linkElement.href = '#';
                        linkElement.classList.add('disabled');
                        linkElement.classList.replace('btn-primary', 'btn-secondary');
                    }
                }
            });
             console.log(`[Debug] Attached change listener to ${selectElement.id}`);
        }

        // --- Remove the early calls for listeners ---
        // setupDownloadLinkListener(ghostEspVariantSelect, ghostEspDownloadLink); 
        // setupDownloadLinkListener(marauderVariantSelect, marauderDownloadLink); // Call this later too if needed, or ensure elements exist

        // --- Ensure Marauder listener is attached (if elements exist on load) ---
         // It's safer to attach this listener when the Marauder section becomes visible,
         // similar to how we handle GhostESP now. Let's adjust that too.

        // --- REMOVE OLD firmwareSourceSelect listener ---
        /* 
        if (firmwareSourceSelect) {
            firmwareSourceSelect.addEventListener('change', () => {
               // ... OLD LOGIC ...
            });
             console.log('[Debug] Dispatching initial change event for firmwareSourceSelect'); 
            firmwareSourceSelect.dispatchEvent(new Event('change')); 
        } 
        */

        // --- Modify hasFirmwareFilesSelected ---
        function hasFirmwareFilesSelected() {
             // Check based on the *selected method*
             if (selectedFirmwareMethod === 'download') {
                 // If download was chosen, check if Ghost files were extracted
                 return extractedGhostEspFiles && (extractedGhostEspFiles.app.data || extractedGhostEspFiles.bootloader.data || extractedGhostEspFiles.partition.data);
             } else if (selectedFirmwareMethod === 'manual') {
                 // Original check for manual files
                 return (appFileInput?.files?.length > 0) ||
                        (bootloaderFileInput?.files?.length > 0) ||
                        (partitionFileInput?.files?.length > 0);
             }
             return false; // No method selected yet
        }

        // --- Modify updateFlashSummary ---
        function updateFlashSummary() {
            flashSummaryElem.innerHTML = '';
            flashSummaryElem.classList.add('flash-summary-box');
            let hasBinaries = false;
            const addSummaryItem = (icon, text) => {
                flashSummaryElem.innerHTML += `<div class="summary-item"><i class="bi ${icon} me-2"></i> ${text}</div>`;
            };

            // Check based on the *selected method*
            if (selectedFirmwareMethod === 'download' && extractedGhostEspFiles) {
                // Use extracted GhostESP data 
                 if (extractedGhostEspFiles.app.data) {
                     const address = extractedGhostEspFiles.app.addressInput.value;
                     addSummaryItem('bi-file-earmark-binary', `Application: ${extractedGhostEspFiles.app.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
                 if (extractedGhostEspFiles.bootloader.data) {
                     const address = extractedGhostEspFiles.bootloader.addressInput.value;
                     addSummaryItem('bi-hdd-network', `Bootloader: ${extractedGhostEspFiles.bootloader.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
                 if (extractedGhostEspFiles.partition.data) {
                     const address = extractedGhostEspFiles.partition.addressInput.value;
                     addSummaryItem('bi-table', `Partition Table: ${extractedGhostEspFiles.partition.name} at ${address} [Auto]`);
                     hasBinaries = true;
                 }
            } else if (selectedFirmwareMethod === 'manual') {
                // Use manual inputs 
                 if (appFileInput?.files?.length > 0) {
                     // ... (manual file summary) ...
                 }
                 // ... (bootloader/partition summary) ...
            } // else: No method selected or no files yet

             // --- Fallback to manual inputs (keep existing logic inside the 'else' block) ---
             if (selectedFirmwareMethod === 'manual') {
                if (appFileInput?.files?.length > 0) {
                    const file = appFileInput.files[0];
                    const address = appAddressInput.value;
                    addSummaryItem('bi-file-earmark-binary', `Application: ${file.name} at ${address}`);
                    hasBinaries = true;
                }
                if (bootloaderFileInput?.files?.length > 0) {
                    const file = bootloaderFileInput.files[0];
                    const address = bootloaderAddressInput.value;
                    addSummaryItem('bi-hdd-network', `Bootloader: ${file.name} at ${address}`);
                    hasBinaries = true;
                }
                if (partitionFileInput?.files?.length > 0) {
                    const file = partitionFileInput.files[0];
                    const address = partitionAddressInput.value;
                    addSummaryItem('bi-table', `Partition Table: ${file.name} at ${address}`);
                    hasBinaries = true;
                }
             }

            if (!hasBinaries) {
                flashSummaryElem.innerHTML = '<div class="summary-item text-warning"><i class="bi bi-exclamation-triangle me-2"></i> Select method and provide firmware</div>';
                if (flashButton) flashButton.disabled = true; 
            } else {
                 if (flashButton) flashButton.disabled = !connected; 
            }
            addSummaryItem('bi-gear', `Settings: ${flashModeSelect.value.toUpperCase()}, ${flashFreqSelect.value}, ${flashSizeSelect.value}`);
            if (eraseAllCheckbox.checked) {
                addSummaryItem('bi-eraser-fill text-warning', '<strong>Erase all flash before programming</strong>');
            }
             updateButtonStates(); 
        }


        // --- Modify updateButtonStates ---
         function updateButtonStates() {
             // ... (connection button logic) ...
             
             // Action buttons depend on method and files/connection
             const canFlash = connected && hasFirmwareFilesSelected();
             if (flashButton) flashButton.disabled = !canFlash; 
             if (eraseButton) eraseButton.disabled = !connected;
             if (resetButton) resetButton.disabled = !connected;
             
             // ... (connection settings logic) ...

             // Enable "Continue" (Next to Step 4) only if a method is selected AND files are ready
             if (nextToStep4Button) nextToStep4Button.disabled = !hasFirmwareFilesSelected();

             // ... (rest of button logic) ...
         }

        // --- Modify startOver button ---
         startOverButton.addEventListener('click', () => {
             selectFirmwareMethod(null); // Reset the primary choice
             // Existing clear functions are good
             clearExtractedData(); 
             clearManualInputs(); 
             if (connected) {
                 disconnect().then(() => goToStep(1));
             } else {
                 goToStep(1);
             }
         });

        // --- Modify updateBinaryTypeIndicators ---
        function updateBinaryTypeIndicators() {
            document.querySelectorAll('.file-badge').forEach(badge => badge.remove());
            
            let hasApp = false, hasBootloader = false, hasPartition = false;

            // Only show badges based on the *current* state, respecting selected method
            if (selectedFirmwareMethod === 'download' && extractedGhostEspFiles) {
                hasApp = !!extractedGhostEspFiles.app.data;
                hasBootloader = !!extractedGhostEspFiles.bootloader.data;
                hasPartition = !!extractedGhostEspFiles.partition.data;
            } else if (selectedFirmwareMethod === 'manual') {
                 hasApp = appFileInput?.files?.length > 0;
                 hasBootloader = bootloaderFileInput?.files?.length > 0;
                 hasPartition = partitionFileInput?.files?.length > 0;
            }
            // Otherwise, no badges shown if no method is selected

            if (hasApp) { /* ... add badge ... */ }
            if (hasBootloader) { /* ... add badge ... */ }
            if (hasPartition) { /* ... add badge ... */ }
            // --- (No changes needed inside the badge adding logic itself) ---
            if (hasApp) {
                const appButton = document.querySelector('[data-binary="app"]');
                appButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
            if (hasBootloader) {
                const bootloaderButton = document.querySelector('[data-binary="bootloader"]');
                 bootloaderButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
            if (hasPartition) {
                const partitionButton = document.querySelector('[data-binary="partition"]');
                 partitionButton?.insertAdjacentHTML('beforeend', '<span class="file-badge"></span>');
            }
        }
        
         // --- Initialize Step 3 View ---
         // Call selectFirmwareMethod initially with null to ensure correct hidden state
         selectFirmwareMethod(null); 

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