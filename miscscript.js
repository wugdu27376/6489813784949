// 获取DOM元素
var dataurlInput = document.getElementById('dataurl-input');
var parseBtn = document.getElementById('parse-btn');
var parseFileBtn = document.getElementById('parse-file-btn');
var fileInput = document.getElementById('file-input');
var clearBtn = document.getElementById('clear-btn');
var filesContainer = document.getElementById('files-container');

// 存储已解析的文件
var files = [];

// 解析单个链接
function parseDataURL(url) {
    // 检查是否是blob URL
    if (url.indexOf('blob:') === 0) {
        return parseBlobURL(url);
    }
    
    // 检查是否是data URL
    if (url.indexOf('data:') === 0) {
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
    
    // 尝试作为纯文本处理
    return {
        name: generateRandomTenDigits() + '.txt',
        data: url,
        type: 'text/plain'
    };
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
function downloadFile(index) {
    var file = files[index];
    
    // 创建下载链接
    var link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    
    // 触发下载
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

// 解析按钮点击事件
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
    
    // 检查是否是文本文件
    if (file.type.indexOf('text/') !== 0 && file.name.lastIndexOf('.txt') !== file.name.length - 4) {
        showToast('请选择文本文件');
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
        var blob = new Blob([fileDataUrl], {type: 'text/plain'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name + '.dataurl.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('DataURL已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('DataURL链接:', fileDataUrl);
        if (result) {
            // 尝试复制到剪贴板
            if (document.execCommand) {
                var textarea = document.createElement('textarea');
                textarea.value = fileDataUrl;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast('DataURL已复制到剪贴板');
                } catch (err) {
                    showToast('DataURL已生成');
                }
                document.body.removeChild(textarea);
            } else {
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
        var blob = new Blob([blobUrl], {type: 'text/plain'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name + '.bloburl.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Blob URL已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('Blob URL链接:', blobUrl);
        if (result) {
            // 尝试复制到剪贴板
            if (document.execCommand) {
                var textarea = document.createElement('textarea');
                textarea.value = blobUrl;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast('Blob URL已复制到剪贴板');
                } catch (err) {
                    showToast('Blob URL已生成');
                }
                document.body.removeChild(textarea);
            } else {
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
        var blob = new Blob([base64Data], {type: 'text/plain'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = selectedFile.name + '.base64.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Base64已保存为文件');
    } else {
        // 显示在prompt中
        var result = prompt('Base64数据:', base64Data);
        if (result) {
            // 尝试复制到剪贴板
            if (document.execCommand) {
                var textarea = document.createElement('textarea');
                textarea.value = base64Data;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    showToast('Base64已复制到剪贴板');
                } catch (err) {
                    showToast('Base64已生成');
                }
                document.body.removeChild(textarea);
            } else {
                showToast('Base64已生成');
            }
        }
    }
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

clearBtn.addEventListener('click', clearAll);

// 初始化
renderFilesList();