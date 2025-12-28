// 获取DOM元素
var dataurlInput = document.getElementById('dataurl-input');
var parseBtn = document.getElementById('parse-btn');
var parseFileBtn = document.getElementById('parse-file-btn');
var fileInput = document.getElementById('file-input');
var clearBtn = document.getElementById('clear-btn');
var filesContainer = document.getElementById('files-container');
var toJsonBtn = document.getElementById('to-json-btn');
var toJson2Btn = document.getElementById('to-json2-btn');

// 存储已解析的文件
var files = [];

// 解析单个链接
function parseDataURL(url) {
    // 检查是否是blob URL
    if (url.indexOf('blob:') === 0) {
        return parseBlobURL(url);
    }
    
    if (url.indexOf('{') === 0 || url.indexOf('[') === 0) {
       try {
            var jsonData = JSON.parse(url);
            if (jsonData && jsonData.data) {
                return parseJsonData(jsonData);
            }
        } catch (e) {
            // 不是有效的JSON，继续其他格式检查
        }
    }
    
    // 检查URL片段中的JSON2格式
    if (url.indexOf('#') !== -1) {
        try {
            var fragment = decodeURIComponent(url.split('#')[1]);
            if (fragment.indexOf('{"files":') === 0 || fragment.indexOf('{"files":') > 0) {
                return parseJson2Data(fragment);
            }
        } catch (e) {
            // 不是有效的JSON(2)，继续其他格式检查
        }
    }
    
// 检查是否是data URL（包括从文本文件导入的编码过的DataURL）
if (url.indexOf('data:') === 0 || url.indexOf('data:text/plain;charset=utf-8,data:') === 0) {
    // 如果是编码过的DataURL（从保存的文件中导入）
    if (url.indexOf('data:text/plain;charset=utf-8,data:') === 0) {
        // 提取真正的DataURL部分
        var decodedUrl = decodeURIComponent(url.replace('data:text/plain;charset=utf-8,', ''));
        return parseDataURI(decodedUrl);
    }
    return parseDataURI(url);
}

    // 检查是否是base64数据（可能没有data:前缀）
    if (url.indexOf('base64,') !== -1) {
        // 尝试添加data:前缀
        if (url.indexOf('data:') !== 0) {
            url = 'data:application/octet-stream;base64,' + url;
        }
        return parseDataURI(url);
    }

    // 尝试作为纯base64数据（没有base64,标识符）
    if (isBase64Data(url)) {
        url = 'data:application/octet-stream;base64,' + url;
        return parseDataURI(url);
    }

    // 尝试作为纯文本处理
    return {
        name: generateRandomTenDigits() + '.txt',
        data: url,
        type: 'text/plain'
    };
}

// 在miscscript.js中，parseDataURI函数后添加parseJsonData函数
function parseJsonData(jsonData) {
    var fileName = jsonData.filename || generateRandomTenDigits();
    var data = jsonData.data;
    var mimeType = jsonData.type || 'application/octet-stream';
    
    // 检查数据是否是base64格式
    if (typeof data === 'string' && (data.indexOf('data:') === 0 || isBase64Data(data))) {
        // 如果是DataURL或base64数据
        if (data.indexOf('data:') === 0) {
            // 已经是DataURL格式
            return {
                name: fileName,
                data: data,
                type: mimeType
            };
        } else {
            // 是base64数据，转换为DataURL
            return {
                name: fileName,
                data: 'data:' + mimeType + ';base64,' + data,
                type: mimeType
            };
        }
    } else {
        // 纯文本数据
        return {
            name: fileName + '.txt',
            data: 'data:text/plain;charset=utf-8,' + encodeURIComponent(String(data)),
            type: 'text/plain'
        };
    }
}

function parseJson2Data(jsonStr) {
    try {
        var jsonData = JSON.parse(jsonStr);
        if (jsonData && jsonData.files && jsonData.files.length > 0) {
            var fileInfo = jsonData.files[0];
            var fileName = fileInfo.name || generateRandomTenDigits();
            var data = fileInfo.data;
            var mimeType = fileInfo.type || 'application/octet-stream';
            
            // 将base64数据转换为DataURL
            var dataUrl = 'data:' + mimeType + ';base64,' + data;
            
            return {
                name: fileName,
                data: dataUrl,
                type: mimeType
            };
        }
    } catch (e) {
        throw new Error('无效的JSON(2)格式');
    }
    throw new Error('无效的JSON(2)数据');
}

// 检查是否是base64数据
function isBase64Data(str) {
    // 移除可能的空白字符
    var cleanStr = str.trim();
    
    // 如果是URL编码的数据，先解码
    if (cleanStr.indexOf('%') !== -1) {
        try {
            cleanStr = decodeURIComponent(cleanStr);
        } catch (e) {
            // 解码失败，使用原始字符串
        }
    }
    
    // 检查是否包含DataURL前缀，如果有则提取base64部分
    if (cleanStr.indexOf('base64,') !== -1) {
        var parts = cleanStr.split('base64,');
        if (parts.length > 1) {
            cleanStr = parts[1];
        }
    }

    // base64通常包含A-Z, a-z, 0-9, +, /, =，长度是4的倍数
    if (cleanStr.length % 4 !== 0) {
        return false;
    }

    // 检查字符集
    var base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanStr)) {
        return false;
    }

    // 基本长度检查（至少几个字符）
    if (cleanStr.length < 4) {
        return false;
    }

    return true;
}

// 解析Blob URL
function parseBlobURL(blobURL) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', blobURL, true);
        xhr.responseType = 'blob';

        xhr.onload = function() {
            if (this.status === 200) {
                var blob = this.response;
                // 从blob中提取文件名（使用随机十位数字）
                var randomNum = generateRandomTenDigits();
                var fileName = randomNum;
                if (blob.type) {
                    var ext = getExtensionFromMimeType(blob.type);
                    fileName = randomNum + '.' + ext;
                }

                var reader = new FileReader();
                reader.onload = function() {
                    resolve({
                        name: fileName,
                        data: reader.result,
                        type: blob.type || 'application/octet-stream'
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            } else {
                reject(new Error('获取blob数据失败'));
            }
        };

        xhr.onerror = reject;
        xhr.send();
    });
}

// 解析Data URI
function parseDataURI(dataURI) {
    // 解析data URI
    var matches = dataURI.match(/^data:(.+?)(;base64)?,(.*)$/);
    if (!matches) {
        throw new Error('无效的Data URI格式');
    }

    var mimeType = matches[1] || 'application/octet-stream';
    var isBase64 = !!matches[2];
    var data = matches[3];

    // 获取文件名（使用随机十位数字）
    var randomNum = generateRandomTenDigits();
    var ext = getExtensionFromMimeType(mimeType);
    var fileName = ext ? randomNum + '.' + ext : randomNum;

    // 如果已经是base64数据，直接返回
    if (isBase64) {
        return {
            name: fileName,
            data: dataURI,
            type: mimeType
        };
    }

    // 如果不是base64，则可能需要编码
    return {
        name: fileName,
        data: dataURI,
        type: mimeType
    };
}

// 根据MIME类型获取文件扩展名
function getExtensionFromMimeType(mimeType) {
    var mimeMap = {
        'text/plain': 'txt',
        'text/html': 'html',
        'text/css': 'css',
        'text/javascript': 'js',
        'application/json': 'json',
        'application/pdf': 'pdf',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'video/mp4': 'mp4',
        'application/zip': 'zip'
    };

    return mimeMap[mimeType] || 'bin';
}

// 生成随机十位数字
function generateRandomTenDigits() {
    var result = '';
    for (var i = 0; i < 10; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

// 生成唯一的文件名
function generateUniqueName(baseName, index) {
    var dotIndex = baseName.lastIndexOf('.');
    var name, ext;

    if (dotIndex === -1) {
        name = baseName;
        ext = '';
    } else {
        name = baseName.substring(0, dotIndex);
        ext = baseName.substring(dotIndex);
    }

    return index > 0 ? name + '(' + index + ')' + ext : baseName;
}

// 检查文件名是否已存在
function fileNameExists(fileName) {
    for (var i = 0; i < files.length; i++) {
        if (files[i].name === fileName) {
            return true;
        }
    }
    return false;
}

// 添加文件到列表
function addFileToList(fileInfo) {
    // 检查文件名是否已存在，避免重复
    var fileName = fileInfo.name;
    var counter = 0;

    while (fileNameExists(fileName)) {
        counter++;
        fileName = generateUniqueName(fileInfo.name, counter);
    }

    fileInfo.name = fileName;
    files.push(fileInfo);
    renderFilesList();
}

// 渲染文件列表
function renderFilesList() {
    filesContainer.innerHTML = '';

    if (files.length === 0) {
        filesContainer.innerHTML = '<div class="no-files">暂无解析的文件</div>';
        clearBtn.className = 'hidden';
        return;
    }

    // 显示清除按钮
    clearBtn.className = '';

    // 渲染每个文件项
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        fileItem.innerHTML = '<div class="file-name" title="' + file.name + '">' + file.name +
            '</div><div class="file-actions">' +
            '<button class="download-btn" data-index="' + i + '">下载</button>' +
            '<button class="delete-btn" data-index="' + i + '">删除</button>' +
            '</div>';

        filesContainer.appendChild(fileItem);
    }

    // 添加下载和删除事件监听器
    var downloadBtns = document.querySelectorAll('.download-btn');
    for (var j = 0; j < downloadBtns.length; j++) {
        downloadBtns[j].addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            downloadFile(index);
        });
    }

    var deleteBtns = document.querySelectorAll('.delete-btn');
    for (var k = 0; k < deleteBtns.length; k++) {
        deleteBtns[k].addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            deleteFile(index);
        });
    }
}

// 下载文件
// 在miscscript.js中，修改downloadFile函数的第172行附近
function downloadFile(index) {
    var file = files[index];
    
    // 检查是否是JSON(2)格式的URL
    if (file.data.indexOf('#') !== -1 && file.data.indexOf('{"files":') !== -1) {
        try {
            // 从URL片段中提取JSON数据
            var fragment = decodeURIComponent(file.data.split('#')[1]);
            var jsonData = JSON.parse(fragment);
            
            if (jsonData && jsonData.files && jsonData.files.length > 0) {
                var fileInfo = jsonData.files[0];
                var data = fileInfo.data;
                var mimeType = fileInfo.type || 'application/octet-stream';
                var fileName = fileInfo.name || 'downloaded_file';
                
                // 将base64数据转换为DataURL进行下载
                var dataUrl = 'data:' + mimeType + ';base64,' + data;
                var link = document.createElement('a');
                link.href = dataUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                return;
            }
        } catch (e) {
            // 如果解析失败，使用原始方式下载
            console.error('解析JSON(2)失败:', e);
        }
    }
    
    // 普通文件下载
    var link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 删除文件
function deleteFile(index) {
    files.splice(index, 1);
    renderFilesList();
}

// 清除所有文件
function clearAll() {
    files = [];
    dataurlInput.value = '';
    fileInput.value = '';
    renderFilesList();
}

// 解析文本文件中的链接
function parseTextFile(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        var content = event.target.result;
        var lines = content.split('\n');
        var validLines = [];

        // 过滤空行
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== '') {
                validLines.push(lines[i].trim());
            }
        }

        if (validLines.length === 0) {
            return;
        }

        // 解析每一行
        for (var j = 0; j < validLines.length; j++) {
            try {
                var line = validLines[j];
                var fileInfo = parseDataURL(line);

                // 如果是Promise，需要等待
                if (fileInfo && fileInfo.then) {
                    fileInfo.then(function(info) {
                        addFileToList(info);
                        showToast('文件解析成功: ' + info.name);
                    }).catch(function(err) {
                        showToast('解析链接失败: ' + err.message);
                    });
                } else {
                    addFileToList(fileInfo);
                }
            } catch (err) {
                showToast('解析链接失败: ' + err.message);
            }
        }
    };

    reader.readAsText(file);
}

parseBtn.addEventListener('click', function() {
    var inputText = dataurlInput.value;

    if (!inputText.trim()) {
        showToast('请输入链接');
        return;
    }

    // 分割多行链接
    var lines = inputText.split('\n');
    var validLines = [];

    // 过滤空行
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line !== '') {
            validLines.push(line);
        }
    }

    if (validLines.length === 0) {
        showToast('请输入有效的链接');
        return;
    }

    // 解析每一行链接
    var successCount = 0;
    var errorCount = 0;

    for (var j = 0; j < validLines.length; j++) {
        try {
            var line = validLines[j];
            var fileInfo = parseDataURL(line);

            // 如果是Promise，需要等待
            if (fileInfo && fileInfo.then) {
                fileInfo.then(function(info) {
                    addFileToList(info);
                    successCount++;
                    // 如果是最后一个链接，显示汇总提示
                    if (successCount + errorCount === validLines.length) {
                        showSummaryToast(successCount, errorCount);
                    }
                }).catch(function(err) {
                    errorCount++;
                    // 如果是最后一个链接，显示汇总提示
                    if (successCount + errorCount === validLines.length) {
                        showSummaryToast(successCount, errorCount);
                    }
                });
            } else {
                addFileToList(fileInfo);
                successCount++;
                // 如果是最后一个链接，显示汇总提示
                if (successCount + errorCount === validLines.length) {
                    showSummaryToast(successCount, errorCount);
                }
            }
        } catch (err) {
            errorCount++;
            // 如果是最后一个链接，显示汇总提示
            if (successCount + errorCount === validLines.length) {
                showSummaryToast(successCount, errorCount);
            }
        }
    }
});

// 显示汇总提示的函数
function showSummaryToast(successCount, errorCount) {
    if (errorCount === 0) {
        showToast('成功解析 ' + successCount + ' 个文件');
    } else if (successCount === 0) {
        showToast('解析失败 ' + errorCount + ' 个链接');
    } else {
        showToast('成功解析 ' + successCount + ' 个文件，失败 ' + errorCount + ' 个');
    }
}

parseFileBtn.addEventListener('click', function() {
    fileInput.click();
});

fileInput.addEventListener('change', function() {
    if (this.files.length === 0) {
        return;
    }

    var file = this.files[0];

    // 检查是否是文本文件或JSON文件
    var isTextFile = file.type.indexOf('text/') === 0;
    var isTxtFile = file.name.lastIndexOf('.txt') === file.name.length - 4;
    var isJsonFile = file.name.lastIndexOf('.json') === file.name.length - 5;
    if (!isTextFile && !isTxtFile && !isJsonFile) {
        showToast('请选择文本文件或JSON文件');
        this.value = '';
        return;
    }
    
    parseTextFile(file);
    this.value = '';
});

// Toast提示功能
var toast = document.getElementById('toast');
var toastTimer = null;

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.className = 'toast show';

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function() {
        toast.className = 'toast';
    }, 2000);
}

// 文件转链接功能相关变量
var convertFileInput = document.getElementById('convert-file-input');
var selectFileBtn = document.getElementById('select-file-btn');
var selectedFileName = document.getElementById('selected-file-name');
var toDataurlBtn = document.getElementById('to-dataurl-btn');
var toBlobBtn = document.getElementById('to-blob-btn');
var toBase64Btn = document.getElementById('to-base64-btn');
var saveAsFileCheckbox = document.getElementById('save-as-file');

var selectedFile = null;
var fileDataUrl = null;

// 选择/删除文件
selectFileBtn.addEventListener('click', function() {
    if (selectFileBtn.textContent === '删除文件') {
        // 删除当前选择的文件
        selectedFile = null;
        fileDataUrl = null;
        selectedFileName.textContent = '未选择文件';
        selectFileBtn.textContent = '选择文件';
        convertFileInput.value = '';
        showToast('已删除选择文件');
    } else {
        // 选择新文件
        convertFileInput.click();
    }
});

convertFileInput.addEventListener('change', function() {
    if (this.files.length === 0) {
        selectedFile = null;
        selectedFileName.textContent = '未选择文件';
        selectFileBtn.textContent = '选择文件';
        return;
    }

    selectedFile = this.files[0];
    selectedFileName.textContent = selectedFile.name;
    selectFileBtn.textContent = '删除文件';

    // 读取文件为DataURL
    var reader = new FileReader();
    reader.onload = function(e) {
        fileDataUrl = e.target.result;
    };
    reader.readAsDataURL(selectedFile);
    this.value = '';
});

// 转换功能
function convertToDataURL() {
    if (!selectedFile || !fileDataUrl) {
        showToast('请先选择文件');
        return;
    }

    if (saveAsFileCheckbox.checked) {
        // 保存为文本文件
        var base64Data = btoa(unescape(encodeURIComponent(fileDataUrl)));
        var dataStr = "data:text/plain;base64," + base64Data;
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", selectedFile.name + '.dataurl.txt');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('DataURL已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('DataURL链接:', fileDataUrl);
        if (result !== null) {
            // 用户没有点击取消
            try {
                navigator.clipboard.writeText(fileDataUrl).then(function() {
                    showToast('DataURL已复制到剪贴板');
                }).catch(function(err) {
                    // 如果clipboard API失败，使用传统方法
                    if (document.execCommand) {
                        var textarea = document.createElement('textarea');
                        textarea.value = fileDataUrl;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        showToast('DataURL已复制到剪贴板');
                    } else {
                        showToast('DataURL已生成');
                    }
                });
            } catch (err) {
                showToast('DataURL已生成');
            }
        }
    }
}

function convertToBlob() {
    if (!selectedFile) {
        showToast('请先选择文件');
        return;
    }

    var blobUrl = URL.createObjectURL(selectedFile);

    if (saveAsFileCheckbox.checked) {
        // 保存为文本文件
        var base64Data = btoa(unescape(encodeURIComponent(blobUrl)));
        var dataStr = "data:text/plain;base64," + base64Data;
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", selectedFile.name + '.bloburl.txt');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('Blob URL已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('Blob URL链接:', blobUrl);
        if (result !== null) {
            // 用户没有点击取消
            try {
                navigator.clipboard.writeText(blobUrl).then(function() {
                    showToast('Blob URL已复制到剪贴板');
                }).catch(function(err) {
                    // 如果clipboard API失败，使用传统方法
                    if (document.execCommand) {
                        var textarea = document.createElement('textarea');
                        textarea.value = blobUrl;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        showToast('Blob URL已复制到剪贴板');
                    } else {
                        showToast('Blob URL已生成');
                    }
                });
            } catch (err) {
                showToast('Blob URL已生成');
            }
        }
    }
}

function convertToBase64() {
    if (!selectedFile || !fileDataUrl) {
        showToast('请先选择文件');
        return;
    }

    // 从DataURL中提取base64部分
    var base64Data = fileDataUrl.split(',')[1];
    if (!base64Data) {
        showToast('无法提取base64数据');
        return;
    }

    if (saveAsFileCheckbox.checked) {
        // 保存为文本文件
        var encodedBase64 = btoa(unescape(encodeURIComponent(base64Data)));
        var dataStr = "data:text/plain;base64," + encodedBase64;
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", selectedFile.name + '.base64.txt');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showToast('Base64已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('Base64数据:', base64Data);
        if (result !== null) {
            // 用户没有点击取消
            try {
                navigator.clipboard.writeText(base64Data).then(function() {
                    showToast('Base64已复制到剪贴板');
                }).catch(function(err) {
                    // 如果clipboard API失败，使用传统方法
                    if (document.execCommand) {
                        var textarea = document.createElement('textarea');
                        textarea.value = base64Data;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        showToast('Base64已复制到剪贴板');
                    } else {
                        showToast('Base64已生成');
                    }
                });
            } catch (err) {
                showToast('Base64已生成');
            }
        }
    }
}

function convertToJson() {
    if (!selectedFile) {
        showToast('请先选择文件');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var content = e.target.result;
        var jsonObject = {
            filename: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            lastModified: selectedFile.lastModified,
            data: null
        };

        // 根据文件类型处理数据
        if (selectedFile.type.indexOf('text/') === 0 || 
            selectedFile.type === 'application/json' ||
            selectedFile.name.endsWith('.txt') ||
            selectedFile.name.endsWith('.json')) {
            // 文本文件直接包含内容
            jsonObject.data = content;
        } else {
            // 二进制文件转换为base64
            var dataUrlReader = new FileReader();
            dataUrlReader.onload = function(dataEvent) {
                jsonObject.data = dataEvent.target.result.split(',')[1] || dataEvent.target.result;
                finishJsonConversion(jsonObject);
            };
            dataUrlReader.readAsDataURL(selectedFile);
            return;
        }

        finishJsonConversion(jsonObject);
    };

    function finishJsonConversion(jsonObject) {
        var jsonString = JSON.stringify(jsonObject);
        
        if (saveAsFileCheckbox.checked) {
            var base64Data = btoa(unescape(encodeURIComponent(jsonString)));
            var dataStr = "data:application/json;base64," + base64Data;
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", selectedFile.name + '.json');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('JSON已保存为文件');
        } else {
            // 显示在prompt中
            var result = prompt('JSON数据:', jsonString);
            if (result !== null) {
                // 用户没有点击取消
                try {
                    navigator.clipboard.writeText(jsonString).then(function() {
                        showToast('JSON已复制到剪贴板');
                    }).catch(function(err) {
                        // 如果clipboard API失败，使用传统方法
                        if (document.execCommand) {
                            var textarea = document.createElement('textarea');
                            textarea.value = jsonString;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            showToast('JSON已复制到剪贴板');
                        } else {
                            showToast('JSON已生成');
                        }
                    });
                } catch (err) {
                    showToast('JSON已生成');
                }
            }
        }
    }

    reader.readAsText(selectedFile);
}

// 在miscscript.js中，convertToJson函数后添加convertToJson2函数
function convertToJson2() {
    if (!selectedFile) {
        showToast('请先选择文件');
        return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
        var fileData = [{
            name: selectedFile.name,
            size: selectedFile.size,
            type: selectedFile.type,
            lastModified: selectedFile.lastModified,
            data: e.target.result.split(',')[1]
        }];
        
        var data = {
            files: fileData
        };
        var dataStr = JSON.stringify(data);
        var currentUrl = window.location.href.split('#')[0];
        var jsonUrl = currentUrl + '#' + encodeURIComponent(dataStr);

        if (saveAsFileCheckbox.checked) {
            // 保存为文件
            var base64Data = btoa(unescape(encodeURIComponent(jsonUrl)));
            var downloadDataStr = "data:application/json;base64," + base64Data;
            var downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", downloadDataStr);
            downloadAnchorNode.setAttribute("download", selectedFile.name + '.json2.txt');
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            showToast('JSON2已保存为文件');
        } else {
            // 显示在prompt中
            var result = prompt('JSON2链接:', jsonUrl);
            if (result !== null) {
                // 用户没有点击取消
                var textToCopy = result === jsonUrl ? jsonUrl : result;
                try {
                    navigator.clipboard.writeText(textToCopy).then(function() {
                        showToast('JSON2已复制到剪贴板');
                    }).catch(function(err) {
                        // 如果clipboard API失败，使用传统方法
                        if (document.execCommand) {
                            var textarea = document.createElement('textarea');
                            textarea.value = textToCopy;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            showToast('JSON2已复制到剪贴板');
                        } else {
                            showToast('JSON2已生成');
                        }
                    });
                } catch (err) {
                    showToast('JSON2已生成');
                }
            }
        }
    };
    
    reader.readAsDataURL(selectedFile);
}

// 加载保存的勾选状态
var savedCheckboxState = localStorage.getItem('save-as-file-checked');
if (savedCheckboxState !== null) {
    saveAsFileCheckbox.checked = savedCheckboxState === 'true';
}

// 保存勾选状态到localStorage
saveAsFileCheckbox.addEventListener('change', function() {
    localStorage.setItem('save-as-file-checked', this.checked);
});

// 绑定转换按钮事件
toDataurlBtn.addEventListener('click', convertToDataURL);
toBlobBtn.addEventListener('click', convertToBlob);
toBase64Btn.addEventListener('click', convertToBase64);
toJsonBtn.addEventListener('click', convertToJson);
toJson2Btn.addEventListener('click', convertToJson2);

clearBtn.addEventListener('click', clearAll);

// 初始化
renderFilesList();