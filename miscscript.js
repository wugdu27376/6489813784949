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
    
    // 检查是否是有效的链接格式
    if (!isValidLink(url)) {
        throw new Error('无效的链接格式');
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

function isValidLink(url) {
    var trimmedUrl = url.trim();
    
    // 空字符串不算有效链接
    if (!trimmedUrl) {
        return false;
    }
    
    // 检查是否是已知的有效格式
    var validFormats = [
        // Data URL格式
        /^data:.*/i,
        // Blob URL格式
        /^blob:.*/i,
        // Base64格式（可能没有前缀）
        /^[A-Za-z0-9+/]+={0,2}$/,
        // JSON格式
        /^\{.*\}$/,
        /^\[.*\]$/,
        // JSON(2)格式（带#号）
        /.*#.*/,
        // 有效的URL格式（包含常见协议）
        /^(https?|ftp|file):\/\/.+/i
    ];
    
    // 检查是否符合任一有效格式
    for (var i = 0; i < validFormats.length; i++) {
        if (validFormats[i].test(trimmedUrl)) {
            // 如果是URL格式，进一步验证
            if (validFormats[i].toString().indexOf('https?') !== -1) {
                try {
                    new URL(trimmedUrl);
                    return true;
                } catch (e) {
                    return false;
                }
            }
            return true;
        }
    }
    
    // 检查长度（太短的可能是普通文本）
    if (trimmedUrl.length < 10) {
        return false;
    }
    
    // 检查是否包含特殊字符（链接通常有特殊字符）
    var hasSpecialChars = /[:/#?&=%+;,.]/.test(trimmedUrl);
    if (!hasSpecialChars) {
        return false;
    }
    
    return true;
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

        var isPreviewable = isPreviewableFile(file);
        var previewBtnHtml = isPreviewable ? 
            '<button class="preview-btn" data-index="' + i + '">预览</button>' : '';
            
            fileItem.innerHTML = '<div class="file-name" title="' + file.name + '">' + file.name +
            '</div><div class="file-actions">' +
            previewBtnHtml +
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
    
    var previewBtns = document.querySelectorAll('.preview-btn');
    for (var l = 0; l < previewBtns.length; l++) {
        previewBtns[l].addEventListener('click', function() {
            var index = parseInt(this.getAttribute('data-index'));
            previewFile(index);
        });
    }
}

// 在miscscript.js中，deleteFile函数后添加previewFile函数
function previewFile(index) {
    var file = files[index];
    
    // 创建自定义弹窗
    createCustomModal(file);
}

// 添加自定义弹窗函数
function createCustomModal(fileInfo) {
    // 创建遮罩层
    var overlay = document.createElement('div');
    overlay.className = 'preview-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;';
    
    var originalOverflow = document.body.style.overflow;
    var originalPosition = document.body.style.position;
    var originalWidth = document.body.style.width;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    
    // 禁止滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = -scrollTop + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    
    // 创建弹窗容器
    var modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.style.cssText = 'position:fixed;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);-moz-transform:translate(-50%,-50%);-ms-transform:translate(-50%,-50%);-o-transform:translate(-50%,-50%);transform:translate(-50%,-50%);background:#fff;border-radius:2px;z-index:9999;padding:20px;min-width:300px;max-width:90vw;max-height:90vh;overflow:auto;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    
    // 创建内容区域
    var content = document.createElement('div');
    content.className = 'preview-content';
    content.style.cssText = 'margin-bottom:40px;';
    
    // 创建关闭按钮
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'position:relative;left:70%;bottom:10px;padding:8px 16px;background:#4a6ee0;color:white;border:none;border-radius:2px;cursor:pointer;';
    
    closeBtn.onmouseover = function() {
        this.style.backgroundColor = '#3a5ed0';
    };
    closeBtn.onmouseout = function() {
        this.style.backgroundColor = '#4a6ee0';
    };
    closeBtn.addEventListener('touchstart', function() {
        this.style.backgroundColor = '#3a5ed0';
        this.style.transform = 'translateY(0)';
    });
    closeBtn.addEventListener('touchend', function() {
        this.style.backgroundColor = '#4a6ee0';
        this.style.transform = 'translateY(0)';
    });
    
    // 根据文件类型创建不同的预览内容
    var type = fileInfo.type || '';
    var fileName = fileInfo.name || '未命名文件';
    
    // 创建标题
    var title = document.createElement('h3');
    title.textContent = '预览: ' + fileName;
    title.style.cssText = 'margin-top:0;margin-bottom:15px;color:#333;';
    
    content.appendChild(title);
    
    // 图片预览
    if (type.indexOf('image/') === 0) {
        var img = document.createElement('img');
        img.src = fileInfo.data;
        img.style.cssText = 'max-width:100%;max-height:60vh;display:block;margin:0 auto;';
        img.alt = fileName;
        content.appendChild(img);
    }
    // 其他文件类型
    else {
        var message = document.createElement('p');
        message.textContent = '此文件类型不支持预览';
        message.style.cssText = 'text-align:center;color:#666;padding:20px;';
        content.appendChild(message);
    }
    
    // 组装弹窗
    modal.appendChild(content);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    
    // 添加到页面
    document.body.appendChild(overlay);
    
    // 关闭弹窗函数
    function closeModal() {
        document.body.removeChild(overlay);
        // 恢复滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
    
        if (originalPosition !== 'fixed') {
            window.scrollTo(0, scrollTop);
        }
    }
    
    // 绑定关闭事件
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function escHandler(e) {
        if (e.keyCode === 27) { // ESC键
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

function createFileDropModal(callback, multiple) {
    // 创建遮罩层
    var overlay = document.createElement('div');
    overlay.className = 'file-drop-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;';
    
    // 创建弹窗容器
    var modal = document.createElement('div');
    modal.className = 'file-drop-modal';
    modal.style.cssText = 'position:fixed;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);-moz-transform:translate(-50%,-50%);-ms-transform:translate(-50%,-50%);-o-transform:translate(-50%,-50%);transform:translate(-50%,-50%);background:#fff;border-radius:3px;z-index:9999;padding:30px;width:400px;max-width:90vw;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    
    // 创建拖放框
    var dropZone = document.createElement('div');
    dropZone.className = 'file-drop-zone';
    dropZone.style.cssText = 'border:2px dashed #ccc;border-radius:2px;padding:40px 20px;margin-bottom:20px;background:#f9f9f9;';
    
    // 拖放框文本
    var dropText = document.createElement('div');
    dropText.textContent = '将文件拖入到框内';
    dropText.style.cssText = 'font-size:16px;color:#666;margin-bottom:20px;';
    
    // 创建文件输入
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'modal-file-input';
    fileInput.style.cssText = 'display:none;';
    if (multiple) {
        fileInput.multiple = true;
    }
    
    // 创建选择文件按钮
    var selectBtn = document.createElement('button');
    selectBtn.textContent = '选择文件';
    selectBtn.style.cssText = 'padding:10px 30px;background:#4a6ee0;color:white;border:none;border-radius:2px;cursor:pointer;font-size:16px;';
    
    selectBtn.onmouseover = function() {
        this.style.backgroundColor = '#3a5ed0';
    };
    selectBtn.onmouseout = function() {
        this.style.backgroundColor = '#4a6ee0';
    };
    selectBtn.addEventListener('touchstart', function() {
        this.style.backgroundColor = '#3a5ed0';
        this.style.transform = 'translateY(0)';
    });
    selectBtn.addEventListener('touchend', function() {
        this.style.backgroundColor = '#4a6ee0';
        this.style.transform = 'translateY(0)';
    });
    
    // 创建关闭按钮
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.cssText = 'position:relative;left:38%;padding:8px 20px;background:#e05a5a;color:white;border:none;border-radius:2px;cursor:pointer;';
    
    closeBtn.onmouseover = function() {
        this.style.backgroundColor = '#d04a4a';
    };
    closeBtn.onmouseout = function() {
        this.style.backgroundColor = '#e05a5a';
    };
    closeBtn.addEventListener('touchstart', function() {
        this.style.backgroundColor = '#d04a4a';
        this.style.transform = 'translateY(0)';
    });
    closeBtn.addEventListener('touchend', function() {
        this.style.backgroundColor = '#e05a5a';
        this.style.transform = 'translateY(0)';
    });
    
    // 组装弹窗
    dropZone.appendChild(dropText);
    dropZone.appendChild(fileInput);
    dropZone.appendChild(selectBtn);
    modal.appendChild(dropZone);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    
    // 添加到页面
    document.body.appendChild(overlay);
    
    // 禁止滚动
    var originalOverflow = document.body.style.overflow;
    var originalPosition = document.body.style.position;
    var originalWidth = document.body.style.width;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.top = -scrollTop + 'px';
    
    // 拖放功能
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#4a6ee0';
        dropZone.style.background = '#f0f5ff';
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f9f9f9';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#ccc';
        dropZone.style.background = '#f9f9f9';
        
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            callback(files);
            closeModal();
        }
    }
    
    // 绑定拖放事件
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // 绑定按钮事件
    selectBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            callback(this.files);
            closeModal();
        }
    });
    
    // 关闭弹窗函数
    function closeModal() {
        // 恢复滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.top = '';
        
        if (originalPosition !== 'fixed') {
            window.scrollTo(0, scrollTop);
        }
        
        // 移除事件监听
        dropZone.removeEventListener('dragover', handleDragOver);
        dropZone.removeEventListener('dragleave', handleDragLeave);
        dropZone.removeEventListener('drop', handleDrop);
        
        // 移除弹窗
        document.body.removeChild(overlay);
    }
    
    // 绑定关闭事件
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function escHandler(e) {
        if (e.keyCode === 27) {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// 在miscscript.js中，renderFilesList函数前添加isPreviewableFile函数
function isPreviewableFile(fileInfo) {
    var type = fileInfo.type || '';
    var name = fileInfo.name || '';
    
    // 图片类型
    var imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
    
    // 检查MIME类型
    if (imageTypes.indexOf(type) !== -1) {
        return true;
    }
    
    // 检查文件扩展名
    var ext = name.split('.').pop().toLowerCase();
    var imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    
    if (imageExts.indexOf(ext) !== -1) {
        return true;
    }
    
    return false;
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
            var line = lines[i].trim();
            if (line !== '') {
                validLines.push(line);
            }
        }

        if (validLines.length === 0) {
            showToast('文件中没有有效内容');
            return;
        }

        var successCount = 0;
        var errorCount = 0;
        var pendingPromises = 0;
        var totalLines = validLines.length;

        // 解析每一行
        for (var j = 0; j < validLines.length; j++) {
            try {
                var line = validLines[j];
                var fileInfo = parseDataURL(line);

                // 如果是Promise，需要等待
                if (fileInfo && fileInfo.then) {
                    pendingPromises++;
                    fileInfo.then(function(info) {
                        addFileToList(info);
                        successCount++;
                        pendingPromises--;
                        checkCompletion();
                    }).catch(function(err) {
                        errorCount++;
                        pendingPromises--;
                        checkCompletion();
                    });
                } else {
                    addFileToList(fileInfo);
                    successCount++;
                    checkCompletion();
                }
            } catch (err) {
                errorCount++;
                checkCompletion();
            }
        }

        function checkCompletion() {
            // 所有行都处理完成时显示统计结果
            if (successCount + errorCount === totalLines && pendingPromises === 0) {
                if (errorCount === 0) {
                    showToast('成功解析 ' + successCount + ' 个链接');
                } else if (successCount === 0) {
                    showToast('解析失败 ' + errorCount + ' 个链接');
                } else {
                    showToast('成功解析 ' + successCount + ' 个链接，错误 ' + errorCount + ' 个');
                }
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
    createFileDropModal(function(files) {
        // 只允许.txt和.json文件
        var validFiles = [];
        var invalidFiles = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var fileName = file.name.toLowerCase();
            var isTxtFile = fileName.endsWith('.txt');
            var isJsonFile = fileName.endsWith('.json');
            
            if (isTxtFile || isJsonFile) {
                validFiles.push(file);
            } else {
                invalidFiles.push(file.name);
            }
        }

        if (validFiles.length === 0) {
            if (invalidFiles.length > 0) {
                showToast('请选择.txt或.json文件');
            }
            return;
        }

        if (invalidFiles.length > 0) {
            showToast('已跳过' + invalidFiles.length + '个非.txt/.json文件');
        }

        // 解析所有有效文件
        for (var j = 0; j < validFiles.length; j++) {
            parseTextFile(validFiles[j]);
        }
    }, true);
});

fileInput.addEventListener('change', function() {
    if (this.files.length === 0) {
        return;
    }

    var validFiles = [];
    var invalidFiles = [];

    // 检查所有选择的文件，只允许.txt和.json文件
    for (var i = 0; i < this.files.length; i++) {
        var file = this.files[i];
        var fileName = file.name.toLowerCase();
        var isTxtFile = fileName.endsWith('.txt');
        var isJsonFile = fileName.endsWith('.json');
        
        if (isTxtFile || isJsonFile) {
            validFiles.push(file);
        } else {
            invalidFiles.push(file.name);
        }
    }

    if (validFiles.length === 0) {
        if (invalidFiles.length > 0) {
            showToast('请选择.txt或.json文件');
        }
        this.value = '';
        return;
    }

    if (invalidFiles.length > 0) {
        showToast('已跳过' + invalidFiles.length + '个非.txt/.json文件');
    }

    // 解析所有有效文件
    for (var j = 0; j < validFiles.length; j++) {
        parseTextFile(validFiles[j]);
    }
    
    this.value = '';
});

var currentToast = null;
var toastTimer = null;
var pendingToastTimer = null;

function showToast(message) {
    // 取消之前所有待处理的toast
    if (pendingToastTimer) {
        clearTimeout(pendingToastTimer);
        pendingToastTimer = null;
    }
    
    // 如果已有toast正在显示，立即收起它
    if (currentToast) {
        var oldToast = currentToast;
        currentToast = null;
        
        // 立即移除旧toast，不等待动画
        if (oldToast.parentNode) {
            oldToast.style.transition = 'none';
            oldToast.style.top = '-100px';
            oldToast.style.opacity = '0';
            
            // 直接移除，不等待动画
            setTimeout(function() {
                if (oldToast.parentNode) {
                    document.body.removeChild(oldToast);
                }
            }, 0);
        }
        
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }
    }
    
    // 延迟创建新toast，防止连续快速创建
    pendingToastTimer = setTimeout(function() {
        createNewToast(message);
        pendingToastTimer = null;
    }, 10);
}

function createNewToast(message) {
    // 创建一个新的toast元素
    currentToast = document.createElement('div');
    currentToast.className = 'toast';
    currentToast.textContent = message;
    currentToast.style.cssText = 'position:fixed;left:50%;top:-100px;-webkit-transform:translateX(-50%);-moz-transform:translateX(-50%);-ms-transform:translateX(-50%);-o-transform:translateX(-50%);transform:translateX(-50%);background-color:#333;color:white;padding:12px 24px;border-radius:3px;z-index:1000;opacity:0.9;max-width:80%;text-align:center;transition:top 0.15s ease-out, opacity 0.15s;';
    
    // 添加到页面
    document.body.appendChild(currentToast);
    
    // 强制重绘，确保transition生效
    currentToast.offsetHeight;
    
    // 显示toast（下移到20px位置）
    currentToast.style.top = '20px';
    
    // 设置自动收起
    toastTimer = setTimeout(function() {
        if (currentToast) {
            var toastToRemove = currentToast;
            toastToRemove.style.top = '-100px';
            toastToRemove.style.opacity = '0';
            
            // 动画结束后移除元素
            setTimeout(function() {
                if (toastToRemove && toastToRemove.parentNode) {
                    document.body.removeChild(toastToRemove);
                    if (currentToast === toastToRemove) {
                        currentToast = null;
                    }
                }
            }, 150);
        }
        toastTimer = null;
    }, 2000);
}

// 添加新的内部函数用于显示toast
function showNewToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.className = 'toast show';

    toastTimer = setTimeout(function() {
        toast.className = 'toast';
        toastTimer = null; // 重置计时器
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
var selectedFiles = null;

// 选择/删除文件
selectFileBtn.addEventListener('click', function() {
    if (selectFileBtn.id === 'select-file-btn') {
        // 使用弹窗选择文件
        createFileDropModal(function(files) {
            // 修复旧版本浏览器兼容性：将FileList转换为数组
            var filesArray = [];
            for (var f = 0; f < files.length; f++) {
                filesArray.push(files[f]);
            }
            selectedFiles = filesArray;
            
            // 添加：处理单个文件的情况
            if (selectedFiles.length === 1) {
                selectedFile = selectedFiles[0];  // 设置selectedFile变量
                // 读取文件为DataURL
                var reader = new FileReader();
                reader.onload = function(e) {
                    fileDataUrl = e.target.result;  // 设置fileDataUrl变量
                };
                reader.readAsDataURL(selectedFile);
            } else {
                selectedFile = null;  // 多个文件时清空selectedFile
                fileDataUrl = null;   // 多个文件时清空fileDataUrl
            }
            
            if (selectedFiles.length === 1) {
                selectedFileName.textContent = selectedFiles[0].name;
            } else {
                selectedFileName.textContent = '已选择 ' + selectedFiles.length + ' 个文件';
            }
            
            selectFileBtn.textContent = '删除文件';
            selectFileBtn.id = 'delete-file-btn';
            
            // 清空之前的URL缓存
            fileDataUrls = {};
            
            // 为每个文件读取DataURL
            for (var i = 0; i < selectedFiles.length; i++) {
                (function(index) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        fileDataUrls[index] = e.target.result;
                    };
                    reader.readAsDataURL(selectedFiles[index]);
                })(i);
            }
        }, true);
    } else {
        // 删除所有选择的文件
        selectedFiles = [];
        selectedFile = null;  // 添加：清空selectedFile变量
        fileDataUrl = null;   // 添加：清空fileDataUrl变量
        fileDataUrls = {};    // 修改：清空fileDataUrls对象
        selectedFileName.textContent = '未选择文件';
        selectFileBtn.textContent = '选择文件';
        selectFileBtn.id = 'select-file-btn';
        showToast('已删除所有选择文件');
    }
});

convertFileInput.addEventListener('change', function() {
    if (this.files.length === 0) {
        selectedFile = null;
        selectedFiles = null;
        selectedFileName.textContent = '未选择文件';
        selectFileBtn.textContent = '选择文件';
        return;
    }

    if (this.files.length === 1) {
        // 单个文件模式
        selectedFile = this.files[0];
        selectedFiles = null;
        selectedFileName.textContent = selectedFile.name;
        selectFileBtn.textContent = '删除文件';

        // 读取文件为DataURL
        var reader = new FileReader();
        reader.onload = function(e) {
            fileDataUrl = e.target.result;
        };
        reader.readAsDataURL(selectedFile);
    } else {
        // 多个文件模式
        selectedFile = null;
        selectedFiles = Array.from(this.files);
        selectedFileName.textContent = '已选择 ' + this.files.length + ' 个文件';
        selectFileBtn.textContent = '删除文件';
        fileDataUrl = null;
    }
    this.value = '';
});

// 转换功能
function convertToDataURL() {
    // 检查是否是多个文件
    if (selectedFiles && selectedFiles.length > 1) {
        convertMultipleFilesToDataURL();
        return;
    }
    
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
            // 使用传统复制方法
            var textarea = document.createElement('textarea');
            textarea.value = result === fileDataUrl ? fileDataUrl : result;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            var success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                showToast('DataURL已复制到剪贴板');
            } else {
                showToast('DataURL复制失败');
            }
        }
    }
}

function convertToBlob() {
    // 检查是否是多个文件
    if (selectedFiles && selectedFiles.length > 1) {
        convertMultipleFilesToBlob();
        return;
    }
    
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
            // 使用传统复制方法
            var textarea = document.createElement('textarea');
            textarea.value = result === blobUrl ? blobUrl : result;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            var success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                showToast('Blob URL已复制到剪贴板');
            } else {
                showToast('Blob URL复制失败');
            }
        }
    }
}

function convertToBase64() {
    // 检查是否是多个文件
    if (selectedFiles && selectedFiles.length > 1) {
        convertMultipleFilesToBase64();
        return;
    }
    
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
            // 使用传统复制方法
            var textarea = document.createElement('textarea');
            textarea.value = result === base64Data ? base64Data : result;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            var success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                showToast('Base64已复制到剪贴板');
            } else {
                showToast('Base64复制失败');
            }
        }
    }
}

function convertToJson() {
    // 检查是否是多个文件
    if (selectedFiles && selectedFiles.length > 1) {
        convertMultipleFilesToJson();
        return;
    }
    
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
                // 使用传统复制方法
                var textarea = document.createElement('textarea');
                textarea.value = result === jsonString ? jsonString : result;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                var success = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (success) {
                    showToast('JSON已复制到剪贴板');
                } else {
                    showToast('JSON复制失败');
                }
            }
        }
    }

    reader.readAsText(selectedFile);
}

// 在miscscript.js中，convertToJson函数后添加convertToJson2函数
function convertToJson2() {
    // 检查是否是多个文件
    if (selectedFiles && selectedFiles.length > 1) {
        convertMultipleFilesToJson2();
        return;
    }
    
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
                // 使用传统复制方法
                var textarea = document.createElement('textarea');
                textarea.value = result === jsonUrl ? jsonUrl : result;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                var success = document.execCommand('copy');
                document.body.removeChild(textarea);
                
                if (success) {
                    showToast('JSON2已复制到剪贴板');
                } else {
                    showToast('JSON2复制失败');
                }
            }
        }
    };
    
    reader.readAsDataURL(selectedFile);
}

function formatTimestampForFilename() {
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    
    // 格式化数字，确保两位数，第一位是0时显示0
    var monthStr = month < 10 ? '0' + month : month.toString();
    var dayStr = day < 10 ? '0' + day : day.toString();
    var hoursStr = hours < 10 ? '0' + hours : hours.toString();
    var minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();
    var secondsStr = seconds < 10 ? '0' + seconds : seconds.toString();
    
    return year + monthStr + dayStr + '_' + hoursStr + minutesStr + secondsStr;
}

// 多文件转换为DataURL链接文件
function convertMultipleFilesToDataURL() {
    var promises = [];
    
    // 为每个文件创建读取Promise
    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        var promise = new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
        promises.push(promise);
    }
    
    // 等待所有文件读取完成
    Promise.all(promises).then(function(dataUrls) {
        saveAsFileCheckbox.checked = true;
        localStorage.setItem('save-as-file-checked', 'true');
        
        // 创建文本内容，每行一个DataURL
        var content = '';
        for (var j = 0; j < dataUrls.length; j++) {
            content += dataUrls[j] + '\n';
        }
        
        // 创建下载链接
        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        var timestamp = formatTimestampForFilename();
        downloadAnchorNode.setAttribute("download", "dataurls_" + timestamp + ".txt");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        
        // 释放URL对象
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('已生成 ' + selectedFiles.length + ' 个DataURL链接文件');
    });
}

// 多文件转换为Blob链接文件
function convertMultipleFilesToBlob() {
    saveAsFileCheckbox.checked = true;
    localStorage.setItem('save-as-file-checked', 'true');
    
    // 创建文本内容，每行一个Blob URL
    var content = '';
    var urls = [];
    
    for (var i = 0; i < selectedFiles.length; i++) {
        var blobUrl = URL.createObjectURL(selectedFiles[i]);
        urls.push(blobUrl);
        content += blobUrl + '\n';
    }
    
    // 创建下载链接
    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    var timestamp = formatTimestampForFilename();
    downloadAnchorNode.setAttribute("download", "bloburls_" + timestamp + ".txt");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    document.body.removeChild(downloadAnchorNode);
    
    // 清理Blob URLs
    setTimeout(function() {
        URL.revokeObjectURL(url);
        for (var j = 0; j < urls.length; j++) {
            URL.revokeObjectURL(urls[j]);
        }
    }, 100);
    
    showToast('已生成 ' + selectedFiles.length + ' 个Blob链接文件');
}

// 多文件转换为Base64链接文件
function convertMultipleFilesToBase64() {
    var promises = [];
    
    // 为每个文件创建读取Promise
    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        var promise = new Promise(function(resolve) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var dataUrl = e.target.result;
                var base64Data = dataUrl.split(',')[1] || dataUrl;
                resolve(base64Data);
            };
            reader.readAsDataURL(file);
        });
        promises.push(promise);
    }
    
    // 等待所有文件读取完成
    Promise.all(promises).then(function(base64DataArray) {
        saveAsFileCheckbox.checked = true;
        localStorage.setItem('save-as-file-checked', 'true');
        
        // 创建文本内容，每行一个Base64数据
        var content = '';
        for (var j = 0; j < base64DataArray.length; j++) {
            content += base64DataArray[j] + '\n';
        }
        
        // 创建下载链接
        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        var timestamp = formatTimestampForFilename();
        downloadAnchorNode.setAttribute("download", "base64data_" + timestamp + ".txt");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        
        // 释放URL对象
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('已生成 ' + selectedFiles.length + ' 个Base64数据文件');
    });
}

// 多文件转换为JSON链接文件
function convertMultipleFilesToJson() {
    var promises = [];
    
    // 为每个文件创建读取Promise
    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        (function(file) {
            var promise = new Promise(function(resolve) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var content = e.target.result;
                    var jsonObject = {
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                        data: null
                    };

                    // 根据文件类型处理数据
                    if (file.type.indexOf('text/') === 0 || 
                        file.type === 'application/json' ||
                        file.name.endsWith('.txt') ||
                        file.name.endsWith('.json')) {
                        // 文本文件直接包含内容
                        jsonObject.data = content;
                    } else {
                        // 二进制文件转换为base64
                        var dataUrlReader = new FileReader();
                        dataUrlReader.onload = function(dataEvent) {
                            jsonObject.data = dataEvent.target.result.split(',')[1] || dataEvent.target.result;
                            resolve(JSON.stringify(jsonObject));
                        };
                        dataUrlReader.readAsDataURL(file);
                        return;
                    }

                    resolve(JSON.stringify(jsonObject));
                };
                reader.readAsText(file);
            });
            promises.push(promise);
        })(file);
    }
    
    // 等待所有文件读取完成
    Promise.all(promises).then(function(jsonStrings) {
        saveAsFileCheckbox.checked = true;
        localStorage.setItem('save-as-file-checked', 'true');
        
        // 创建文本内容，每行一个JSON字符串
        var content = '';
        for (var j = 0; j < jsonStrings.length; j++) {
            content += jsonStrings[j] + '\n';
        }
        
        // 创建下载链接
        var blob = new Blob([content], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        var timestamp = formatTimestampForFilename();
        downloadAnchorNode.setAttribute("download", "jsondata" + timestamp + ".txt");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        
        // 释放URL对象
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('已生成 ' + selectedFiles.length + ' 个JSON数据文件');
    });
}

// 多文件转换为JSON2链接文件
// 多文件转换为JSON2链接文件
function convertMultipleFilesToJson2() {
    var promises = [];
    
    // 为每个文件创建读取Promise
    for (var i = 0; i < selectedFiles.length; i++) {
        var file = selectedFiles[i];
        (function(file) {
            var promise = new Promise(function(resolve) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var fileData = {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: file.lastModified,
                        data: e.target.result.split(',')[1]
                    };
                    resolve(fileData);
                };
                reader.readAsDataURL(file);
            });
            promises.push(promise);
        })(file);
    }
    
    // 等待所有文件读取完成
    Promise.all(promises).then(function(fileDataArray) {
        saveAsFileCheckbox.checked = true;
        localStorage.setItem('save-as-file-checked', 'true');
        
        // 创建文本内容，每个JSON2链接单独一行
        var content = '';
        for (var j = 0; j < fileDataArray.length; j++) {
            var data = {
                files: [fileDataArray[j]]
            };
            var dataStr = JSON.stringify(data);
            var currentUrl = window.location.href.split('#')[0];
            var jsonUrl = currentUrl + '#' + encodeURIComponent(dataStr);
            content += jsonUrl + '\n';
        }
        
        // 创建下载链接（将JSON2链接保存为文本文件）
        var blob = new Blob([content], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        var timestamp = formatTimestampForFilename();
        downloadAnchorNode.setAttribute("download", "json2links_" + timestamp + ".txt");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        
        // 释放URL对象
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast('已生成 ' + selectedFiles.length + ' 个JSON2链接文件');
    });
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