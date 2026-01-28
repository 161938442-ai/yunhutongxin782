// 全局变量
let currentUser = null;
let currentRole = null;
let currentSurveyType = null;
let currentSection = 0;
let studentAnswers = {};
let uploadedResources = [];
let studentSections = ['section-all'];

// IndexedDB 数据库名称和版本
const DB_NAME = 'ResourceStorage';
const DB_VERSION = 2;
let db = null;

// 初始化数据库
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = function(event) {
            console.error('数据库初始化失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('数据库初始化成功');
            resolve(db);
        };
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // 创建存储对象
            if (!db.objectStoreNames.contains('resources')) {
                db.createObjectStore('resources', { keyPath: 'type' });
            }
            
            // 创建用户记录存储对象
            if (!db.objectStoreNames.contains('userRecords')) {
                db.createObjectStore('userRecords', { keyPath: 'id', autoIncrement: true });
            }
            
            console.log('数据库结构更新成功');
        };
    });
}

// 保存资源包到数据库
function saveResourceToDatabase(resource) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        const request = store.put(resource);
        
        request.onerror = function(event) {
            console.error('保存资源包失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            console.log('资源包保存成功');
            resolve();
        };
    });
}

// 从数据库读取所有资源包
function getAllResourcesFromDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['resources'], 'readonly');
        const store = transaction.objectStore('resources');
        const request = store.getAll();
        
        request.onerror = function(event) {
            console.error('读取资源包失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            console.log('资源包读取成功');
            resolve(request.result);
        };
    });
}

// 从数据库删除资源包
function deleteResourceFromDatabase(type) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['resources'], 'readwrite');
        const store = transaction.objectStore('resources');
        const request = store.delete(type);
        
        request.onerror = function(event) {
            console.error('删除资源包失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            console.log('资源包删除成功');
            resolve();
        };
    });
}

// 保存用户记录到数据库
function saveUserRecordToDatabase(record) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['userRecords'], 'readwrite');
        const store = transaction.objectStore('userRecords');
        const request = store.add(record);
        
        request.onerror = function(event) {
            console.error('保存用户记录失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            console.log('用户记录保存成功');
            resolve();
        };
    });
}

// 从数据库读取所有用户记录
function getAllUserRecordsFromDatabase() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['userRecords'], 'readonly');
        const store = transaction.objectStore('userRecords');
        const request = store.getAll();
        
        request.onerror = function(event) {
            console.error('读取用户记录失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            console.log('用户记录读取成功:', request.result.length);
            resolve(request.result);
        };
    });
}

// 从数据库读取指定用户的记录
function getUserRecordsFromDatabase(username) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(['userRecords'], 'readonly');
        const store = transaction.objectStore('userRecords');
        const request = store.getAll();
        
        request.onerror = function(event) {
            console.error('读取用户记录失败:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            const userRecords = request.result.filter(record => record.username === username);
            console.log('用户记录读取成功:', userRecords.length);
            resolve(userRecords);
        };
    });
}

// 初始化老师问卷模块
function initTeacherSurveyModule() {
    // 显示唯一的section
    showTeacherSection(0);
    
    // 提交按钮点击事件
    document.getElementById('teacher-submit-btn').addEventListener('click', function() {
        console.log('教师提交按钮被点击');
        
        // 检查是否完成所有题目
        const isComplete = checkTeacherAnswersComplete();
        console.log('教师答案完整性检查:', isComplete);
        
        if (!isComplete) {
            alert('请完成所有题目后再提交！');
            return;
        }
        
        // 保存所有答案
        saveTeacherAnswers();
        
        // 分析结果
        console.log('开始分析教师结果...');
        analyzeTeacherResults();
    });
}

// 显示老师测评的某个section
function showTeacherSection(index) {
    // 隐藏所有sections
    const sections = document.querySelectorAll('#teacher-survey-module .survey-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 显示当前section
    const currentSectionElement = document.getElementById('teacher-section-1');
    if (currentSectionElement) {
        currentSectionElement.style.display = 'block';
    }
}

// 检查老师答案是否完整
function checkTeacherAnswersComplete() {
    // 检查性别
    const genderInputs = document.querySelectorAll('input[name="teacher_gender"]:checked');
    if (genderInputs.length === 0) {
        return false;
    }
    
    // 检查教龄
    const teachingYearsInputs = document.querySelectorAll('input[name="teacher_teaching_years"]:checked');
    if (teachingYearsInputs.length === 0) {
        return false;
    }
    
    // 检查学科
    const subjectInputs = document.querySelectorAll('input[name="teacher_subject"]:checked');
    if (subjectInputs.length === 0) {
        return false;
    }
    
    // 检查选择题答案（单选）
    const radioQuestions = ['teacher_q4', 'teacher_q5', 'teacher_q6', 'teacher_q7', 'teacher_q8', 'teacher_q9', 'teacher_q10'];
    for (const questionName of radioQuestions) {
        const inputs = document.querySelectorAll(`input[name="${questionName}"]:checked`);
        if (inputs.length === 0) {
            return false;
        }
    }
    
    return true;
}

// 保存老师测评答案
function saveTeacherAnswers() {
    // 重置答案对象
    teacherAnswers = {};
    
    // 收集基本信息
    // 性别
    const genderInputs = document.querySelectorAll('input[name="teacher_gender"]:checked');
    genderInputs.forEach(input => {
        teacherAnswers.gender = input.value;
    });
    
    // 教龄
    const teachingYearsInputs = document.querySelectorAll('input[name="teacher_teaching_years"]:checked');
    teachingYearsInputs.forEach(input => {
        teacherAnswers.teaching_years = input.value;
    });
    
    // 学科
    const subjectInputs = document.querySelectorAll('input[name="teacher_subject"]:checked');
    subjectInputs.forEach(input => {
        teacherAnswers.subject = input.value;
    });
    
    // 收集选择题答案（单选）
    const radioQuestions = ['teacher_q4', 'teacher_q5', 'teacher_q6', 'teacher_q7', 'teacher_q8', 'teacher_q9', 'teacher_q10'];
    radioQuestions.forEach(questionName => {
        const inputs = document.querySelectorAll(`input[name="${questionName}"]:checked`);
        inputs.forEach(input => {
            teacherAnswers[questionName] = parseInt(input.value);
        });
    });
    
    // 收集开放性问题答案
    const q11Input = document.querySelector('textarea[name="teacher_q11"]');
    if (q11Input) {
        teacherAnswers.q11 = q11Input.value.trim();
    }
    
    const q12Input = document.querySelector('textarea[name="teacher_q12"]');
    if (q12Input) {
        teacherAnswers.q12 = q12Input.value.trim();
    }
    
    console.log('老师答案保存成功:', teacherAnswers);
}

// 分析老师测评结果
function analyzeTeacherResults() {
    // 计算总分
    let totalScore = 0;
    const scoreQuestions = ['teacher_q4', 'teacher_q5', 'teacher_q6', 'teacher_q7', 'teacher_q8', 'teacher_q9', 'teacher_q10'];
    scoreQuestions.forEach(questionName => {
        if (teacherAnswers[questionName]) {
            totalScore += teacherAnswers[questionName];
        }
    });
    
    // 确定老师类型
    let teacherType = '';
    let tags = '';
    
    if (totalScore >= 30) {
        teacherType = '积极健康型';
        tags = '工作满意度高，压力适中，师生关系良好';
    } else if (totalScore >= 20) {
        teacherType = '一般适应型';
        tags = '工作满意度一般，有一定压力，师生关系尚可';
    } else {
        teacherType = '压力较大型';
        tags = '工作满意度较低，压力较大，需要关注';
    }
    
    // 准备AI分析
    const aiAnalysisPromise = analyzeWithAI('teacher', teacherAnswers, totalScore);
    
    aiAnalysisPromise.then(aiAnalysis => {
        // 构建结果对象
        const result = {
            type: 'teacher',
            teacherType: teacherType,
            tags: tags,
            aiAnalysis: aiAnalysis
        };
        
        // 创建用户记录
        const userRecord = {
            username: currentUser,
            role: currentRole,
            surveyType: 'teacher',
            timestamp: new Date().toISOString(),
            answers: teacherAnswers,
            scores: { totalScore: totalScore },
            type: teacherType,
            tags: tags,
            aiAnalysis: aiAnalysis
        };
        
        // 保存到数据库
        saveUserRecordToDatabase(userRecord).then(() => {
            console.log('教师测评记录保存成功');
        }).catch(error => {
            console.error('保存教师测评记录失败:', error);
        });
        
        // 显示结果
        showTeacherResult(result);
    }).catch(error => {
        console.error('AI分析失败:', error);
        
        // 构建结果对象（无AI分析）
        const result = {
            type: 'teacher',
            teacherType: teacherType,
            tags: tags,
            aiAnalysis: 'AI分析暂时不可用，请稍后再试。'
        };
        
        // 创建用户记录
        const userRecord = {
            username: currentUser,
            role: currentRole,
            surveyType: 'teacher',
            timestamp: new Date().toISOString(),
            answers: teacherAnswers,
            scores: { totalScore: totalScore },
            type: teacherType,
            tags: tags,
            aiAnalysis: 'AI分析暂时不可用'
        };
        
        // 保存到数据库
        saveUserRecordToDatabase(userRecord).then(() => {
            console.log('教师测评记录保存成功');
        }).catch(error => {
            console.error('保存教师测评记录失败:', error);
        });
        
        // 显示结果
        showTeacherResult(result);
    });
}

// 显示老师测评结果
function showTeacherResult(result) {
    const resultContent = document.getElementById('result-content');
    let html = '';
    
    html = `
        <div class="result-item">
            <h3>测评结果</h3>
            <p><strong>类型：</strong>${result.teacherType}</p>
            <p><strong>标签：</strong>${result.tags}</p>
            
            ${result.aiAnalysis ? `
            <div class="ai-analysis">
                <h4>AI专业分析</h4>
                <div class="ai-analysis-content">${result.aiAnalysis.replace(/\n/g, '<br>')}</div>
            </div>
            ` : ''}
            
            <div class="result-actions">
                <button id="export-report-btn" class="btn-primary">导出报告</button>
            </div>
        </div>
    `;
    
    resultContent.innerHTML = html;
    
    // 添加导出报告按钮点击事件
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            exportReport(result);
        });
    }
    
    // 显示结果模块
    showModule('result-module');
}

// 老师答案存储
let teacherAnswers = {};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化数据库
    try {
        await initDatabase();
        // 从数据库加载资源包
        const resources = await getAllResourcesFromDatabase();
        if (resources.length > 0) {
            uploadedResources = resources;
            console.log('从数据库加载资源包成功:', resources.length);
        } else {
            // 如果数据库中没有资源包，使用默认资源包数据
            console.log('数据库中没有资源包，使用默认资源包数据');
            // 确保默认资源包数据被保存到数据库
            for (const [type, resource] of Object.entries(resourceData)) {
                try {
                    await saveResourceToDatabase({
                        type: type,
                        name: resource.name,
                        files: resource.files,
                        fileContents: resource.fileContents || {}
                    });
                } catch (error) {
                    console.error(`保存默认资源包 ${type} 失败:`, error);
                }
            }
            // 重新加载资源包
            const updatedResources = await getAllResourcesFromDatabase();
            uploadedResources = updatedResources;
            console.log('初始化默认资源包成功:', updatedResources.length);
        }
    } catch (error) {
        console.error('初始化数据库失败:', error);
        // 即使数据库初始化失败，也使用默认资源包数据
        uploadedResources = Object.entries(resourceData).map(([type, resource]) => ({
            type: type,
            name: resource.name,
            files: resource.files,
            fileContents: resource.fileContents || {},
            uploadTime: new Date().toLocaleString()
        }));
        console.log('使用默认资源包数据作为备选:', uploadedResources.length);
    }
    
    // 初始化认证模块
    initAuthModule();
    
    // 初始化学生测评模块
    initStudentSurveyModule();
    
    // 初始化结果模块
    initResultModule();
    
    // 初始化老师模块
    initTeacherModule();
    
    // 初始化老师问卷模块
    initTeacherSurveyModule();
    
    // 初始化管理员模块
    initAdminModule();
    
    // 初始化资源包模块
    initResourceModule();
    
    // 初始化编辑模态框
    initEditModal();
    
    // 初始化修改密码模态框
    initChangePasswordModal();
    
    // 检查是否在移动端环境
    if (isMobileDevice()) {
        console.log('检测到移动端环境，优化资源加载...');
        // 预加载关键资源
        preloadCriticalResources();
    }
});

// 认证模块初始化
function initAuthModule() {
    // 角色选择事件，根据选择的角色显示或隐藏用户名和密码输入框
    const loginRoleSelect = document.getElementById('login-role');
    const adminLoginFields = document.getElementById('admin-login-fields');
    const adminPasswordFields = document.getElementById('admin-password-fields');
    const loginBtn = document.getElementById('login-btn');
    const startUsingBtn = document.getElementById('start-using-btn');
    
    // 初始状态设置
    updateLoginFormFields();
    
    // 角色选择变化事件
    loginRoleSelect.addEventListener('change', function() {
        updateLoginFormFields();
    });
    
    // 更新登录表单字段显示
    function updateLoginFormFields() {
        const role = loginRoleSelect.value;
        if (role === 'admin') {
            // 管理员显示账号密码输入框
            adminLoginFields.style.display = 'block';
            adminPasswordFields.style.display = 'block';
            loginBtn.style.display = 'block';
            startUsingBtn.style.display = 'none';
        } else {
            // 学生和老师显示"开始使用"按钮
            adminLoginFields.style.display = 'none';
            adminPasswordFields.style.display = 'none';
            loginBtn.style.display = 'none';
            startUsingBtn.style.display = 'block';
        }
    }
    
    // 登录按钮点击事件（仅管理员）
    loginBtn.addEventListener('click', function() {
        const role = loginRoleSelect.value;
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (username && password) {
            // 检测是否为项目组账号
            if (username === 'zszs782' && password === '19765525zs') {
                currentUser = username;
                currentRole = 'admin';
                showModule('admin-module');
            } else {
                alert('用户名或密码错误');
            }
        } else {
            alert('请输入用户名和密码');
        }
    });
    
    // 开始使用按钮点击事件（学生和老师）
    startUsingBtn.addEventListener('click', function() {
        const role = loginRoleSelect.value;
        
        // 模拟登录验证
        currentUser = role === 'student' ? 'student' : 'teacher';
        currentRole = role;
        
        // 跳转到对应角色的模块
        switch (role) {
            case 'student':
                showModule('student-survey-module');
                break;
            case 'teacher':
                showModule('teacher-survey-module');
                break;
        }
    });
}

// 学生测评模块初始化
function initStudentSurveyModule() {
    // 显示唯一的section
    showStudentSection(0);
    
    // 提交按钮点击事件
    document.getElementById('student-submit-btn').addEventListener('click', function() {
        console.log('学生提交按钮被点击');
        
        // 检查是否完成所有题目
        const isComplete = checkStudentAnswersComplete();
        console.log('学生答案完整性检查:', isComplete);
        
        if (!isComplete) {
            alert('请完成所有题目后再提交！');
            return;
        }
        
        // 保存所有答案
        saveStudentAnswers(0);
        
        // 分析结果
        console.log('开始分析学生结果...');
        analyzeStudentResults().catch(error => {
            console.error('分析学生结果失败:', error);
            alert('分析失败，请稍后再试。');
        });
    });
}

// 检查学生答案是否完整
function checkStudentAnswersComplete() {
    // 检查性别
    const genderInputs = document.querySelectorAll('input[name="gender"]:checked');
    if (genderInputs.length === 0) {
        return false;
    }
    
    // 检查年级
    const gradeInputs = document.querySelectorAll('input[name="grade"]:checked');
    if (gradeInputs.length === 0) {
        return false;
    }
    
    // 检查选择题答案（单选）
    const radioQuestions = ['q3', 'q4', 'q5', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'];
    for (const questionName of radioQuestions) {
        const inputs = document.querySelectorAll(`input[name="${questionName}"]:checked`);
        if (inputs.length === 0) {
            return false;
        }
    }
    
    // 检查多选题答案（q6）
    const checkboxInputs = document.querySelectorAll('input[name="q6"]:checked');
    if (checkboxInputs.length === 0) {
        return false;
    }
    
    return true;
}

// 显示学生测评的某个section
function showStudentSection(index) {
    // 隐藏所有sections
    studentSections.forEach(section => {
        const sectionElement = document.getElementById(section);
        if (sectionElement) {
            sectionElement.style.display = 'none';
        }
    });
    
    // 显示当前section
    const currentSectionElement = document.getElementById(studentSections[index]);
    if (currentSectionElement) {
        currentSectionElement.style.display = 'block';
    }
    
    // 更新进度条
    const progressBar = document.getElementById('student-progress-bar');
    if (progressBar) {
        const progress = ((index + 1) / studentSections.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // 更新按钮状态
    const prevBtn = document.getElementById('student-prev-btn');
    if (prevBtn) {
        prevBtn.style.display = index > 0 ? 'block' : 'none';
    }
    
    const nextBtn = document.getElementById('student-next-btn');
    if (nextBtn) {
        nextBtn.style.display = 'none'; // 只有一个section，不需要下一页按钮
    }
    
    const submitBtn = document.getElementById('student-submit-btn');
    if (submitBtn) {
        submitBtn.style.display = 'block'; // 显示提交按钮
    }
}

// 保存学生测评答案
function saveStudentAnswers(sectionIndex) {
    // 重置答案对象
    studentAnswers = {};
    
    // 收集基本信息
    // 名字
    const studentNameInput = document.getElementById('student-name');
    if (studentNameInput && studentNameInput.value.trim()) {
        studentAnswers.name = studentNameInput.value.trim();
    }
    
    // 性别
    const genderInputs = document.querySelectorAll('input[name="gender"]');
    genderInputs.forEach(input => {
        if (input.checked) {
            studentAnswers.gender = input.value;
        }
    });
    
    // 年级
    const gradeInputs = document.querySelectorAll('input[name="grade"]');
    gradeInputs.forEach(input => {
        if (input.checked) {
            studentAnswers.grade = input.value;
        }
    });
    
    // 收集选择题答案（单选）
    const radioQuestions = ['q3', 'q4', 'q5', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'];
    radioQuestions.forEach(questionName => {
        const inputs = document.querySelectorAll(`input[name="${questionName}"]`);
        inputs.forEach(input => {
            if (input.checked) {
                studentAnswers[questionName] = parseInt(input.value);
            }
        });
    });
    
    // 收集多选题答案（q6）
    const checkboxInputs = document.querySelectorAll('input[name="q6"]:checked');
    const q6Answers = [];
    checkboxInputs.forEach(input => {
        q6Answers.push(input.value);
    });
    // 收集其他选项
    const q6Other = document.querySelector('input[name="q6_other"]');
    if (q6Other && q6Other.value.trim()) {
        q6Answers.push(`other: ${q6Other.value.trim()}`);
    }
    if (q6Answers.length > 0) {
        studentAnswers.q6 = q6Answers;
    }
    
    // 收集开放性问题答案
    const q15 = document.querySelector('textarea[name="q15"]');
    if (q15 && q15.value.trim()) {
        studentAnswers.q15 = q15.value.trim();
    }
    
    const q16 = document.querySelector('textarea[name="q16"]');
    if (q16 && q16.value.trim()) {
        studentAnswers.q16 = q16.value.trim();
    }
    
    console.log('保存的学生答案:', studentAnswers);
}

// 显示加载提示
function showLoading(message = '正在分析，请稍候...') {
    // 创建加载提示元素
    let loadingElement = document.getElementById('ai-loading');
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'ai-loading';
        loadingElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(loadingElement);
    }
    
    // 设置加载提示内容
    loadingElement.innerHTML = `
        <div style="text-align: center;">
            <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #c8102e; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
            <p style="font-size: 16px; color: #333;">${message}</p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">感谢你认真填完问卷！愿你每天都开开心心，天天都有好心情～</p>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    // 显示加载提示
    loadingElement.style.display = 'flex';
}

// 隐藏加载提示
function hideLoading() {
    const loadingElement = document.getElementById('ai-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
}

// 显示错误提示
function showError(message = '分析失败，请稍后重试') {
    // 创建错误提示元素
    let errorElement = document.getElementById('ai-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'ai-error';
        errorElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(errorElement);
    }
    
    // 设置错误提示内容
    errorElement.innerHTML = `
        <div style="text-align: center; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h3 style="color: #c8102e; margin-bottom: 15px;">分析失败</h3>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${message}</p>
            <button id="error-close-btn" style="
                background-color: #c8102e;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.3s;
            ">确定</button>
        </div>
    `;
    
    // 显示错误提示
    errorElement.style.display = 'flex';
    
    // 添加关闭按钮事件
    setTimeout(() => {
        const closeBtn = document.getElementById('error-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                errorElement.style.display = 'none';
            });
        }
    }, 100);
}

// 使用AI分析问卷结果
async function analyzeWithAI(role, answers, scores, type) {
    // 显示加载提示
    showLoading('AI正在分析您的问卷结果，请稍候...');
    
    // API密钥（阿里云通义千问）
    const apiKey = 'sk-e5a5b570d93741aabcd155ef467037d2';
    // API端点（阿里云通义千问兼容模式）
    const apiEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    
    // 构建系统提示
    let systemPrompt = '';
    if (role === 'student') {
        // 获取学生名字
        const studentName = answers.name || '同学';
        
        systemPrompt = `你是一位温暖、专业的心理咨询师，擅长与儿童青少年沟通。请根据学生的问卷结果，用通俗易懂的语言，像朋友一样分享你的观察和建议。

请基于以下信息：
- 学生名字：${studentName}
- 学生类型：${type}
- 问卷得分情况：情绪状态${scores.moodScore}分，支持系统${scores.supportScore}分，社交能力${scores.socialScore}分，自尊自信${scores.selfEsteemScore}分
- 问卷答案：${JSON.stringify(answers)}

请生成一段温暖、人文的分析，包括：
1. 对学生心理状态和性格的理解
2. 真诚的肯定和鼓励
3. 简单实用的建议
4. 如何通过红色文化活动促进成长

请用一段话表达，语言自然流畅，不要使用专业术语和符号，就像面对面交流一样温暖。

重要要求：请将结语字数精简到原有长度的60%，在保持人情味和有效内容的前提下，使用更简洁的语言表达核心观点。`;
    } else if (role === 'teacher') {
        systemPrompt = `你是一位温暖、专业的心理咨询师，擅长与教师群体沟通。请根据教师的问卷结果，用通俗易懂的语言，像朋友一样分享你的观察和建议。

请基于以下信息：
- 问卷得分情况：总分${scores}分
- 问卷答案：${JSON.stringify(answers)}

请生成一段温暖、人文的分析，包括：
1. 对教师心理状态和工作状态的理解
2. 真诚的肯定和鼓励
3. 简单实用的建议
4. 如何通过红色文化活动促进个人成长和职业发展

请用一段话表达，语言自然流畅，不要使用专业术语和符号，就像面对面交流一样温暖。`;
    }
    
    try {
        console.log('开始调用阿里云通义千问API（兼容模式）...');
        console.log('API端点:', apiEndpoint);
        console.log('请求参数:', {
            model: 'qwen-plus',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: '请分析这份问卷结果并提供专业建议。' }
            ]
        });
        
        // 调用阿里云通义千问API（兼容模式，使用类似OpenAI的格式）
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-plus', // 使用通义千问的plus模型
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: '请分析这份问卷结果并提供专业建议。' }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        console.log('API响应状态:', response.status);
        console.log('API响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API错误详情:', errorData);
            throw new Error(`API请求失败: ${response.status} - ${errorData.error?.message || errorData.message || '未知错误'}`);
        }
        
        const data = await response.json();
        console.log('API响应数据:', data);
        
        // 处理兼容模式的响应格式（类似OpenAI）
        let aiContent = '';
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            aiContent = data.choices[0].message.content;
        } else if (data.output && data.output.text) {
            aiContent = data.output.text;
        } else if (data.result) {
            aiContent = data.result;
        } else {
            throw new Error('API响应格式错误，无法获取分析结果');
        }
        
        // 隐藏加载提示
        hideLoading();
        return aiContent;
    } catch (error) {
        console.error('AI分析失败:', error);
        // 隐藏加载提示
        hideLoading();
        
        // 生成详细的错误信息
        let errorMessage = 'AI分析失败，系统将使用默认分析结果。';
        if (error.message.includes('401')) {
            errorMessage = 'AI分析失败：API密钥无效或已过期。请检查您的API密钥是否正确。';
        } else if (error.message.includes('403')) {
            errorMessage = 'AI分析失败：API请求被拒绝。可能是API密钥权限不足或请求频率过高。';
        } else if (error.message.includes('429')) {
            errorMessage = 'AI分析失败：API请求频率过高。请稍后再试。';
        } else if (error.message.includes('500')) {
            errorMessage = 'AI分析失败：服务器内部错误。请稍后再试。';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'AI分析失败：网络连接错误。请检查您的网络连接。';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'AI分析失败：跨域资源共享(CORS)错误。请使用本地服务器运行项目。';
        }
        
        // 显示错误提示
        showError(errorMessage);
        
        // 返回默认分析结果
        if (role === 'student') {
            return '根据问卷结果，您的孩子整体心理健康状况良好。建议老师继续关注孩子的情绪变化，鼓励孩子积极参与红色文化活动，培养孩子的自信心和社交能力。';
        } else {
            return '根据问卷结果，整体心理健康状况良好。建议继续关注情绪变化，积极参与红色文化活动，培养自信心和社交能力。';
        }
    }
}

// 分析学生测评结果
async function analyzeStudentResults() {
    // 计算各维度分数
    let moodScore = 0; // 情绪状态分
    let supportScore = 0; // 支持系统分
    let socialScore = 0; // 社交能力分
    let selfEsteemScore = 0; // 自尊自信分
    
    // 计算各维度分数
    // 情绪状态（q3, q9）
    moodScore = (studentAnswers['q3'] || 0) + (studentAnswers['q9'] || 0);
    
    // 支持系统（q4, q10）
    supportScore = (studentAnswers['q4'] || 0) + (studentAnswers['q10'] || 0);
    
    // 社交能力（q5, q6, q8, q11）
    socialScore = (studentAnswers['q5'] || 0) + (studentAnswers['q8'] || 0) + (studentAnswers['q11'] || 0);
    if (studentAnswers['q6'] && Array.isArray(studentAnswers['q6'])) {
        // 社交支持行为加分
        const supportBehaviors = ['teacher', 'friend'];
        const positiveBehaviors = studentAnswers['q6'].filter(item => 
            supportBehaviors.includes(item) || item.includes('hobby')
        );
        socialScore += positiveBehaviors.length;
    }
    
    // 自尊自信（q7, q12, q13, q14）
    selfEsteemScore = (studentAnswers['q7'] || 0) + (studentAnswers['q12'] || 0) + 
                     (studentAnswers['q13'] || 0) + (studentAnswers['q14'] || 0);
    
    // 确定类型
    let studentType = '';
    let tags = '';
    let resourcePack = '';
    let resourcePackContent = {};
    let resourceType = '';
    
    // 新的分类逻辑
    // 1. 压力焦虑型（优先级最高，症状最严重）
    if ((studentAnswers['q13'] === 0) || (studentAnswers['q14'] === 0) || 
        (studentAnswers['q9'] === 0) || (studentAnswers['q3'] <= 2)) {
        studentType = '压力焦虑型';
        tags = '被期待压垮，自我否定，情绪焦虑';
        resourceType = 'anxious';
    }
    // 2. 孤独疏离型
    else if ((studentAnswers['q5'] === 0) || (studentAnswers['q4'] === 0) || 
             (studentAnswers['q8'] === 0) || (studentAnswers['q10'] === 0)) {
        studentType = '孤独疏离型';
        tags = '社交隔离，难以融入群体，情绪低落';
        resourceType = 'lonely';
    }
    // 3. 阳光开朗型
    else if ((studentAnswers['q3'] >= 4) && (studentAnswers['q5'] >= 4) && 
             (studentAnswers['q8'] >= 4) && (studentAnswers['q7'] === 5) && 
             (studentAnswers['q9'] === 5)) {
        studentType = '阳光开朗型';
        tags = '社交积极，情绪稳定，自我认可度高';
        resourceType = 'sunny';
    }
    // 4. 乐观自愈型
    else if ((studentAnswers['q3'] === 3) && (studentAnswers['q4'] >= 4) && 
             (studentAnswers['q9'] === 4) && (studentAnswers['q11'] === 4) && 
             (studentAnswers['q7'] === 4)) {
        studentType = '乐观自愈型';
        tags = '情绪有波动，但能自我调节，心态积极';
        resourceType = 'optimistic';
    }
    // 5. 内敛害羞型
    else if ((studentAnswers['q5'] === 3) && (studentAnswers['q10'] === 4) && 
             (studentAnswers['q8'] === 3) && (studentAnswers['q6'] && 
             studentAnswers['q6'].includes('hide'))) {
        studentType = '内敛害羞型';
        tags = '社交被动，内心敏感，不擅长主动表达';
        resourceType = 'introverted';
    }
    // 6. 矛盾纠结型
    else {
        studentType = '矛盾纠结型';
        tags = '情绪和社交状态不稳定，自我认知摇摆';
        resourceType = 'conflicted';
    }
    
    // 获取资源包信息
    const resource = resourceData[resourceType];
    resourcePack = resource.name;
    resourcePackContent = {
        title: studentType,
        items: resource.files
    };
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    if (uploadedResource) {
        resourcePack = uploadedResource.name;
        resourcePackContent.title = studentType;
        resourcePackContent.items = uploadedResource.files;
    }
    
    // 使用AI分析结果
    const aiAnalysis = await analyzeWithAI('student', studentAnswers, {
        moodScore: moodScore,
        supportScore: supportScore,
        socialScore: socialScore,
        selfEsteemScore: selfEsteemScore
    }, studentType);
    
    // 创建用户记录
    const userRecord = {
        username: currentUser,
        role: currentRole,
        surveyType: 'student',
        timestamp: new Date().toISOString(),
        answers: studentAnswers,
        scores: {
            moodScore: moodScore,
            supportScore: supportScore,
            socialScore: socialScore,
            selfEsteemScore: selfEsteemScore
        },
        type: studentType,
        tags: tags,
        resourcePack: resourcePack,
        aiAnalysis: aiAnalysis
    };
    
    // 保存用户记录到数据库
    try {
        await saveUserRecordToDatabase(userRecord);
        console.log('学生测评记录保存成功');
    } catch (error) {
        console.error('保存学生测评记录失败:', error);
    }
    
    // 显示结果
    showResult({
        type: 'student',
        studentType: studentType,
        tags: tags,
        resourcePack: resourcePack,
        resourcePackContent: resourcePackContent,
        scores: {
            moodScore: moodScore,
            supportScore: supportScore,
            socialScore: socialScore,
            selfEsteemScore: selfEsteemScore
        },
        aiAnalysis: aiAnalysis
    });
}



// 结果模块初始化
function initResultModule() {
    // 查看资源包按钮点击事件
    document.getElementById('view-resource-btn').addEventListener('click', function() {
        showModule('resource-module');
    });
    
    // 退出登录按钮点击事件
    document.getElementById('logout-btn').addEventListener('click', function() {
        logout();
    });
}

// 显示结果
function showResult(result) {
    const resultContent = document.getElementById('result-content');
    let html = '';
    
    if (result.type === 'student') {
        html = `
            <div class="result-item">
                <h3>测评结果</h3>
                <p><strong>类型：</strong>${result.studentType}</p>
                <p><strong>标签：</strong>${result.tags}</p>
                <p><strong>推荐资源包：</strong>${result.resourcePack}</p>
                
                ${result.aiAnalysis ? `
                <div class="ai-analysis">
                    <h4>AI专业分析</h4>
                    <div class="ai-analysis-content">${result.aiAnalysis.replace(/\n/g, '<br>')}</div>
                </div>
                ` : ''}
                
                <div class="result-actions">
                    <button id="export-report-btn" class="btn-primary">导出报告</button>
                </div>
            </div>
        `;
    }
    
    resultContent.innerHTML = html;
    
    // 保存资源包内容
    window.resourcePackContent = result.resourcePackContent;
    
    // 添加导出报告按钮点击事件
    const exportReportBtn = document.getElementById('export-report-btn');
    if (exportReportBtn) {
        exportReportBtn.addEventListener('click', function() {
            exportReport(result);
        });
    }
    
    // 显示结果模块
    showModule('result-module');
}

// 导出报告为图片
function exportReport(result) {
    // 创建一个临时的HTML元素来渲染报告内容
    const reportElement = document.createElement('div');
    reportElement.style.cssText = `
        width: 800px;
        padding: 40px;
        font-family: Arial, sans-serif;
        background-color: white;
        color: black;
    `;
    
    // 构建报告内容
    let reportContent = `
        <h1 style="text-align: center; color: #c8102e; margin-bottom: 30px;">云护童心—儿童心理健康成长调查</h1>
        <h2 style="margin-bottom: 20px;">测评结果</h2>
    `;
    
    if (result.type === 'student') {
        reportContent += `
            <p><strong>类型：</strong>${result.studentType}</p>
            <p><strong>标签：</strong>${result.tags}</p>
            <p><strong>推荐资源包：</strong>${result.resourcePack}</p>
        `;
    }
    
    if (result.aiAnalysis) {
        reportContent += `
            <h3 style="margin-top: 30px; margin-bottom: 15px;">AI专业分析</h3>
            <div style="padding: 20px; background-color: #f5f5f5; border-radius: 5px;">
                ${result.aiAnalysis.replace(/\n/g, '<br>')}
            </div>
        `;
    }
    
    reportContent += `
        <p style="margin-top: 40px; font-size: 12px; color: #666; text-align: right;">报告生成时间：${new Date().toLocaleString()}</p>
    `;
    
    reportElement.innerHTML = reportContent;
    document.body.appendChild(reportElement);
    
    // 使用html2canvas库将HTML元素转换为图片
    // 注意：这里需要确保html2canvas库已经被加载
    if (typeof html2canvas !== 'undefined') {
        html2canvas(reportElement, {
            scale: 2, // 提高图片质量
            useCORS: true, // 允许加载跨域图片
            logging: false
        }).then(function(canvas) {
            // 将canvas转换为图片并下载
            const link = document.createElement('a');
            link.download = `心理健康测评报告_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            // 清理临时元素
            document.body.removeChild(reportElement);
            
            alert('报告导出成功！');
        }).catch(function(error) {
            console.error('导出报告失败:', error);
            alert('导出报告失败，请稍后再试。');
            
            // 清理临时元素
            document.body.removeChild(reportElement);
        });
    } else {
        // 如果html2canvas库未加载，使用替代方案导出为HTML文件
        console.log('html2canvas库未加载，使用替代方案导出报告。');
        
        // 创建HTML文件内容
        const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>心理健康测评报告</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        h1 {
            color: #c8102e;
            text-align: center;
            margin-bottom: 30px;
        }
        h2 {
            margin-top: 40px;
            margin-bottom: 20px;
        }
        h3 {
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .ai-analysis {
            padding: 20px;
            background-color: #f5f5f5;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            font-size: 12px;
            color: #666;
            text-align: right;
        }
    </style>
</head>
<body>
    ${reportElement.innerHTML}
</body>
</html>
        `;
        
        // 创建Blob对象
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `心理健康测评报告_${new Date().getTime()}.html`;
        link.href = URL.createObjectURL(blob);
        link.click();
        
        // 清理临时元素
        document.body.removeChild(reportElement);
        
        alert('报告导出成功！（使用HTML格式替代方案）');
    }
}

// 老师模块初始化
function initTeacherModule() {
    // 菜单切换
    const menuBtns = document.querySelectorAll('#teacher-module .menu-btn');
    menuBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const menu = this.dataset.menu;
            
            // 切换菜单按钮状态
            menuBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 切换内容显示
            const contents = document.querySelectorAll('#teacher-module .menu-content');
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(menu).classList.add('active');
            
            // 如果切换到用户记录管理菜单，加载用户记录
            if (menu === 'user-records') {
                loadUserRecords();
            }
        });
    });
    
    // 筛选按钮点击事件
    document.getElementById('filter-records-btn').addEventListener('click', function() {
        loadUserRecords();
    });
    
    // 退出登录按钮点击事件
    document.getElementById('teacher-logout-btn').addEventListener('click', function() {
        logout();
    });
}

// 加载用户记录
async function loadUserRecords() {
    const recordsList = document.getElementById('records-list');
    recordsList.innerHTML = '<p>加载中...</p>';
    
    try {
        // 获取筛选条件
        const roleFilter = document.getElementById('record-role').value;
        const typeFilter = document.getElementById('record-type').value;
        
        // 从数据库读取所有用户记录
        const allRecords = await getAllUserRecordsFromDatabase();
        
        // 应用筛选
        let filteredRecords = allRecords;
        if (roleFilter) {
            filteredRecords = filteredRecords.filter(record => record.role === roleFilter);
        }
        if (typeFilter) {
            filteredRecords = filteredRecords.filter(record => record.surveyType === typeFilter);
        }
        
        // 按时间戳降序排序
        filteredRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 显示记录
        if (filteredRecords.length === 0) {
            recordsList.innerHTML = '<p>暂无记录</p>';
        } else {
            let html = '<div class="records-header">' +
                '<div>用户</div>' +
                '<div>角色</div>' +
                '<div>测评类型</div>' +
                '<div>测评结果</div>' +
                '<div>时间</div>' +
                '<div>操作</div>' +
                '</div>';
            
            filteredRecords.forEach(record => {
                const date = new Date(record.timestamp).toLocaleString();
                const resultType = record.type || record.studentType;
                
                html += `
                    <div class="record-item">
                        <div>${record.username}</div>
                        <div>${record.role}</div>
                        <div>${record.surveyType === 'student' ? '学生测评' : ''}</div>
                        <div>${resultType}</div>
                        <div>${date}</div>
                        <div>
                            <button class="btn-sm" onclick="viewRecordDetail(${record.id})">查看详情</button>
                        </div>
                    </div>
                `;
            });
            
            recordsList.innerHTML = html;
        }
    } catch (error) {
        console.error('加载用户记录失败:', error);
        recordsList.innerHTML = `<p>加载失败: ${error.message}</p>`;
    }
}

// 查看记录详情
async function viewRecordDetail(recordId) {
    try {
        // 从数据库读取所有用户记录
        const allRecords = await getAllUserRecordsFromDatabase();
        const record = allRecords.find(r => r.id === recordId);
        
        if (!record) {
            alert('记录不存在');
            return;
        }
        
        // 构建详情HTML
        let detailHtml = `
            <h3>记录详情</h3>
            <p><strong>用户：</strong>${record.username}</p>
            <p><strong>角色：</strong>${record.role}</p>
            <p><strong>测评类型：</strong>${record.surveyType === 'student' ? '学生测评' : ''}</p>
            <p><strong>测评时间：</strong>${new Date(record.timestamp).toLocaleString()}</p>
            <p><strong>测评结果：</strong>${record.type || record.studentType}</p>
        `;
        
        // 添加得分信息
        if (record.scores) {
            detailHtml += '<h4>得分情况</h4>';
            if (record.surveyType === 'student') {
                detailHtml += `
                    <p>总分：${record.scores.total}</p>
                    <p>积极心理特质分：${record.scores.aScore}</p>
                    <p>特殊需求筛查分：${record.scores.bScore}</p>
                    <p>红色文化认同分：${record.scores.cScore}</p>
                `;
            }
        }
        
        // 添加AI分析
        if (record.aiAnalysis) {
            detailHtml += '<h4>AI分析</h4>';
            detailHtml += `<p>${record.aiAnalysis.replace(/\n/g, '<br>')}</p>`;
        }
        
        // 显示详情
        const detailDiv = document.createElement('div');
        detailDiv.className = 'record-detail';
        detailDiv.innerHTML = detailHtml;
        
        // 添加导出报告按钮
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn-primary';
        exportBtn.textContent = '导出报告';
        exportBtn.style.marginTop = '20px';
        exportBtn.style.marginRight = '10px';
        exportBtn.addEventListener('click', function() {
            // 构建result对象，调用exportReport函数
            const result = {
                type: record.surveyType,
                studentType: record.type || record.studentType,
                tags: record.tags || '',
                resourcePack: record.resourcePack || '',
                aiAnalysis: record.aiAnalysis || ''
            };
            exportReport(result);
        });
        detailDiv.appendChild(exportBtn);
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-secondary';
        closeBtn.textContent = '关闭';
        closeBtn.style.marginTop = '20px';
        closeBtn.addEventListener('click', function() {
            detailDiv.remove();
        });
        detailDiv.appendChild(closeBtn);
        
        // 显示在页面上
        const recordsList = document.getElementById('records-list');
        recordsList.innerHTML = '';
        recordsList.appendChild(detailDiv);
    } catch (error) {
        console.error('查看记录详情失败:', error);
        alert('查看详情失败: ' + error.message);
    }
}

// 管理员模块初始化
function initAdminModule() {
    // 菜单切换
    const menuBtns = document.querySelectorAll('#admin-module .menu-btn');
    menuBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const menu = this.dataset.menu;
            
            // 切换菜单按钮状态
            menuBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 切换内容显示
            const contents = document.querySelectorAll('#admin-module .menu-content');
            contents.forEach(content => content.classList.remove('active'));
            document.getElementById(menu).classList.add('active');
        });
    });
    

    
    // 退出登录按钮点击事件
    document.getElementById('admin-logout-btn').addEventListener('click', function() {
        logout();
    });
    
    // 初始化资源列表
    updateResourceList();
}

// 资源包数据
let resourceData = {
    sunny: {
        name: '阳光开朗型资源包：社交积极，情绪稳定',
        files: []
    },
    introverted: {
        name: '内敛害羞型资源包：内心敏感，社交被动',
        files: []
    },
    lonely: {
        name: '孤独疏离型资源包：社交隔离，情绪低落',
        files: []
    },
    anxious: {
        name: '压力焦虑型资源包：被期待压垮，自我否定',
        files: []
    },
    optimistic: {
        name: '乐观自愈型资源包：自我调节，心态积极',
        files: []
    },
    conflicted: {
        name: '矛盾纠结型资源包：情绪波动，自我认知摇摆',
        files: []
    }
};

// 更新资源列表
function updateResourceList() {
    const resourceList = document.getElementById('resource-list');
    
    // 清空现有列表
    resourceList.innerHTML = '';
    
    // 添加资源包
    Object.keys(resourceData).forEach(type => {
        // 检查uploadedResources中是否已存在该类型的资源包
        const existingResource = uploadedResources.find(r => r.type === type);
        if (!existingResource) {
            // 只有当uploadedResources中不存在时，才显示resourceData中的资源包
            const resource = resourceData[type];
            const resourceItem = document.createElement('div');
            resourceItem.className = 'resource-item';
            
            const h4 = document.createElement('h4');
            h4.textContent = resource.name;
            resourceItem.appendChild(h4);
            
            const p = document.createElement('p');
            p.textContent = `包含：`;
            resourceItem.appendChild(p);
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-sm';
            editBtn.textContent = '编辑';
            editBtn.addEventListener('click', function() {
                editResource(type);
            });
            resourceItem.appendChild(editBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-sm';
            deleteBtn.textContent = '删除';
            deleteBtn.addEventListener('click', function() {
                deleteResource(type);
            });
            resourceItem.appendChild(deleteBtn);
            
            resourceList.appendChild(resourceItem);
        }
    });
    
    // 添加上传的资源包
    uploadedResources.forEach((resource, index) => {
        const resourceItem = document.createElement('div');
        resourceItem.className = 'resource-item';
        
        const h4 = document.createElement('h4');
        h4.textContent = resource.name;
        resourceItem.appendChild(h4);
        
        const p1 = document.createElement('p');
            p1.textContent = `包含：`;
            resourceItem.appendChild(p1);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-sm';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', function() {
            editResource('uploaded', index);
        });
        resourceItem.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-sm';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', function() {
            deleteResource('uploaded', index);
        });
        resourceItem.appendChild(deleteBtn);
        
        resourceList.appendChild(resourceItem);
    });
}

// 编辑资源包
function editResource(type, index) {
    // 显示模态框
    const modal = document.getElementById('edit-modal');
    modal.style.display = 'block';
    
    // 保存资源类型和索引
    document.getElementById('edit-resource-type').value = type;
    document.getElementById('edit-resource-index').value = index || '';
    
    let resource;
    if (type === 'uploaded') {
        // 上传的资源包
        resource = uploadedResources[index];
    } else {
        // 默认资源包 - 先从uploadedResources中查找，找不到再从resourceData中获取
        const existingResource = uploadedResources.find(r => r.type === type);
        if (existingResource) {
            resource = existingResource;
        } else {
            resource = resourceData[type];
        }
    }
    
    // 填充表单
    document.getElementById('edit-resource-name').value = resource.name;
    
    // 显示当前文件列表
    const filesList = document.getElementById('current-files-list');
    filesList.innerHTML = '';
    
    // 保存当前文件列表的引用
    window.currentEditingFiles = resource.files || [];
    
    // 显示现有文件
    if (window.currentEditingFiles.length > 0) {
        window.currentEditingFiles.forEach((file, idx) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file}</span>
                <button onclick="removeFile(${idx})">删除</button>
            `;
            filesList.appendChild(fileItem);
        });
    } else {
        filesList.innerHTML = '<p>暂无文件</p>';
    }
}

// 移除文件
function removeFile(index) {
    window.currentEditingFiles.splice(index, 1);
    
    // 更新文件列表显示
    const filesList = document.getElementById('current-files-list');
    filesList.innerHTML = '';
    
    if (window.currentEditingFiles.length > 0) {
        window.currentEditingFiles.forEach((file, idx) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file}</span>
                <button onclick="removeFile(${idx})">删除</button>
            `;
            filesList.appendChild(fileItem);
        });
    } else {
        filesList.innerHTML = '<p>暂无文件</p>';
    }
}

// 显示修改密码模态框
function showChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    modal.style.display = 'block';
}

// 初始化编辑模态框
function initEditModal() {
    // 关闭按钮点击事件
    const editCloseBtn = document.querySelector('#edit-modal .close');
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', function() {
            document.getElementById('edit-modal').style.display = 'none';
        });
    }
    
    // 取消按钮点击事件
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            document.getElementById('edit-modal').style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('edit-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 保存按钮点击事件
    const saveResourceBtn = document.getElementById('save-resource-btn');
    if (saveResourceBtn) {
        saveResourceBtn.addEventListener('click', function() {
            try {
                const type = document.getElementById('edit-resource-type').value;
                const index = document.getElementById('edit-resource-index').value;
                const newName = document.getElementById('edit-resource-name').value;
                const fileInput = document.getElementById('edit-resource-files');
                
                console.log('保存资源包开始:', { type, index, newName });
                
                if (type === 'uploaded') {
                    // 上传的资源包
                    if (index !== '' && uploadedResources[index]) {
                        resource = uploadedResources[index];
                    } else {
                        // 如果索引无效，创建一个新的资源包
                        resource = {
                            name: newName || '新资源包',
                            files: [],
                            fileContents: {},
                            type: 'uploaded' // 设置类型为uploaded
                        };
                    }
                } else {
                    // 默认资源包 - 直接修改原有的资源包数据
                    resource = resourceData[type];
                    
                    // 如果资源包不存在，创建一个新的
                    if (!resource) {
                        resource = {
                            name: newName || '新资源包',
                            files: [],
                            fileContents: {},
                            type: type // 设置类型为传入的type
                        };
                    }
                }
                
                // 更新名称
                if (newName) {
                    resource.name = newName;
                }
                
                // 处理文件上传
                const processFiles = () => {
                    // 添加新上传的文件
                    if (fileInput.files.length > 0) {
                        const filePromises = [];
                        
                        for (let i = 0; i < fileInput.files.length; i++) {
                            const file = fileInput.files[i];
                            filePromises.push(new Promise((resolve) => {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    const fileData = {
                                        name: file.name,
                                        content: e.target.result,
                                        type: file.type
                                    };
                                    resolve(fileData);
                                };
                                reader.onerror = function() {
                                    // 如果读取失败，只存储文件名
                                    const fileData = {
                                        name: file.name,
                                        content: null,
                                        type: file.type
                                    };
                                    resolve(fileData);
                                };
                                // 对于文本文件，直接读取文本内容
                                if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                                    reader.readAsText(file, 'utf-8');
                                } else {
                                    // 对于其他文件类型，使用readAsDataURL
                                    reader.readAsDataURL(file);
                                }
                            }));
                        }
                        
                        Promise.all(filePromises).then((fileDatas) => {
                            // 添加文件数据到当前编辑文件列表
                            fileDatas.forEach(fileData => {
                                // 确保文件不重复
                                if (!window.currentEditingFiles.includes(fileData.name)) {
                                    window.currentEditingFiles.push(fileData.name);
                                }
                            });
                            
                            // 存储文件内容
                            if (!resource.fileContents) {
                                resource.fileContents = {};
                            }
                            
                            fileDatas.forEach(fileData => {
                                resource.fileContents[fileData.name] = fileData;
                                console.log('保存文件到资源包:', fileData.name, '类型:', fileData.type, '内容长度:', fileData.content ? fileData.content.length : 0);
                            });
                            
                            // 完成后续操作
                            completeSave();
                        });
                    } else {
                        // 没有新文件，直接完成
                        completeSave();
                    }
                };
                
                // 完成保存操作
                const completeSave = async () => {
                    try {
                        // 更新文件列表
                        resource.files = window.currentEditingFiles;
                        
                        // 添加上传时间
                        if (!resource.uploadTime) {
                            resource.uploadTime = new Date().toLocaleString();
                        }
                        
                        // 对于默认资源包，先检查uploadedResources中是否已存在
                        if (type !== 'uploaded') {
                            const existingIndex = uploadedResources.findIndex(r => r.type === type);
                            if (existingIndex >= 0) {
                                // 更新已存在的资源包
                                uploadedResources[existingIndex] = resource;
                            } else {
                                // 添加新的资源包到uploadedResources
                                uploadedResources.push(resource);
                            }
                            // 同时更新resourceData
                            resourceData[type] = resource;
                        }
                        
                        // 保存到数据库
                        try {
                            await saveResourceToDatabase(resource);
                            console.log('资源包已保存到数据库');
                        } catch (error) {
                            console.error('保存资源包到数据库失败:', error);
                        }
                        
                        // 更新资源列表
                        updateResourceList();
                        
                        // 关闭模态框
                        document.getElementById('edit-modal').style.display = 'none';
                        
                        // 清空文件输入
                        fileInput.value = '';
                        
                        alert('资源包已更新！');
                    } catch (error) {
                        console.error('完成保存操作失败:', error);
                        alert('保存失败: ' + error.message);
                    }
                };
                
                // 开始处理文件
                processFiles();
            } catch (error) {
                console.error('保存按钮点击事件失败:', error);
                alert('操作失败: ' + error.message);
            }
        });
    } else {
        console.error('保存按钮不存在');
    }
}

// 初始化修改密码模态框
function initChangePasswordModal() {
    const modal = document.getElementById('change-password-modal');
    
    // 关闭按钮点击事件
    const closeBtn = document.querySelector('#change-password-modal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // 取消按钮点击事件
    const cancelBtn = document.getElementById('cancel-password-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 保存按钮点击事件
    const saveBtn = document.getElementById('save-password-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // 验证当前密码
            if (currentPassword !== '19765525zs') {
                alert('当前密码错误！');
                return;
            }
            
            // 验证新密码
            if (newPassword.length < 6) {
                alert('新密码长度不能少于6位！');
                return;
            }
            
            // 验证确认密码
            if (newPassword !== confirmPassword) {
                alert('两次输入的新密码不一致！');
                return;
            }
            
            // 这里应该更新密码，现在只是模拟
            alert('密码修改成功！');
            
            // 关闭模态框
            modal.style.display = 'none';
            
            // 清空表单
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        });
    }
}

// 删除资源包
function deleteResource(type, index) {
    // 显示确认弹窗
    if (!confirm('确定要删除这个资源包吗？')) {
        return;
    }
    
    if (type === 'uploaded' && typeof index !== 'undefined') {
        // 获取要删除的资源包类型
        const resourceToDelete = uploadedResources[index];
        if (resourceToDelete && resourceToDelete.type) {
            // 从数据库删除
            deleteResourceFromDatabase(resourceToDelete.type)
                .then(() => {
                    console.log('从数据库删除资源包成功');
                })
                .catch((error) => {
                    console.error('从数据库删除资源包失败:', error);
                });
        }
        // 删除上传的资源包
        uploadedResources.splice(index, 1);
    } else if (type && resourceData[type]) {
        // 重置默认资源包
        const defaultResourceData = {
            sunny: {
                name: '阳光开朗型资源包：社交积极，情绪稳定',
                files: ['社交技巧指南', '情绪管理工具', '团队活动建议']
            },
            introverted: {
                name: '内敛害羞型资源包：内心敏感，社交被动',
                files: ['自我表达练习', '社交自信培养', '情绪识别工具']
            },
            lonely: {
                name: '孤独疏离型资源包：社交隔离，情绪低落',
                files: ['社交融入指南', '情绪支持工具', '亲子沟通建议']
            },
            anxious: {
                name: '压力焦虑型资源包：被期待压垮，自我否定',
                files: ['压力管理技巧', '自我肯定练习', '亲子关系改善']
            },
            optimistic: {
                name: '乐观自愈型资源包：自我调节，心态积极',
                files: ['情绪调节工具', '目标设定指南', '自我激励技巧']
            },
            conflicted: {
                name: '矛盾纠结型资源包：情绪波动，自我认知摇摆',
                files: ['自我探索工具', '情绪稳定技巧', '决策辅助指南']
            }
        };
        resourceData[type] = defaultResourceData[type];
        
        // 从uploadedResources中删除对应的资源包
        const existingIndex = uploadedResources.findIndex(r => r.type === type);
        if (existingIndex >= 0) {
            uploadedResources.splice(existingIndex, 1);
        }
        
        // 从数据库删除对应的上传资源包
        deleteResourceFromDatabase(type)
            .then(() => {
                console.log('从数据库删除对应上传资源包成功');
            })
            .catch((error) => {
                console.error('从数据库删除对应上传资源包失败:', error);
            });
    }
    
    // 更新资源包列表
    updateResourceList();
    
    // 显示删除成功提示
    alert('资源包已删除！');
}

// 资源包模块初始化
function initResourceModule() {
    // 返回按钮点击事件
    document.getElementById('resource-back-btn').addEventListener('click', function() {
        showModule('result-module');
    });
}

// 显示资源包
function showResourcePack() {
    const resourceContent = document.getElementById('resource-content');
    const content = window.resourcePackContent;
    
    if (content) {
        // 确定资源类型
        let resourceType = '';
        if (currentRole === 'student') {
            if (content.title.includes('阳光开朗')) {
                resourceType = 'sunny';
            } else if (content.title.includes('内敛害羞')) {
                resourceType = 'introverted';
            } else if (content.title.includes('孤独疏离')) {
                resourceType = 'lonely';
            } else if (content.title.includes('压力焦虑')) {
                resourceType = 'anxious';
            } else if (content.title.includes('乐观自愈')) {
                resourceType = 'optimistic';
            } else if (content.title.includes('矛盾纠结')) {
                resourceType = 'conflicted';
            }
        }
        
        // 查找上传的对应资源包
        const uploadedResource = uploadedResources.find(r => r.type === resourceType);
        
        let html = '';
        let files = [];
        
        if (uploadedResource) {
            // 显示上传的资源包
            files = uploadedResource.files;
            html = `
                <div class="resource-item ${isMobileDevice() ? 'mobile-resource' : ''}">
                    <h3>${uploadedResource.name}</h3>
                    <h4>包含文件：</h4>
                    <ul>
            `;
            
            files.forEach((file, index) => {
                // 为不同类型的文件生成不同的显示方式
                const fileExtension = file.split('.').pop().toLowerCase();
                let fileAction = '';
                
                // 尝试获取文件内容
                let fileData = null;
                if (uploadedResource.fileContents && uploadedResource.fileContents[file]) {
                    fileData = uploadedResource.fileContents[file];
                } else {
                    // 尝试不区分大小写查找
                    for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents || {})) {
                        if (storedFileName.toLowerCase() === file.toLowerCase()) {
                            fileData = data;
                            break;
                        }
                    }
                }
                
                if (fileData && fileData.content) {
                    // 对于图片文件，直接显示
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewImage('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于视频文件，直接播放
                    else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="playVideo('${encodeURIComponent(file)}')">播放</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于音频文件，直接播放
                    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="playAudio('${encodeURIComponent(file)}')">播放</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于PDF文件，直接查看
                    else if (fileExtension === 'pdf') {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewPDF('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于文本文件，直接查看
                    else if (['txt', 'html', 'htm', 'css', 'js', 'json'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewText('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 其他文件类型，提供下载
                    else {
                        fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                    }
                } else {
                    // 没有文件内容，提供下载
                    fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                }
                
                html += `<li class="${isMobileDevice() ? 'mobile-file-item' : ''}">
                    <span>${file}</span>
                    ${fileAction}
                </li>`;
            });
            
            html += `
                    </ul>
                </div>
            `;
        } else if (resourceType && resourceData[resourceType]) {
            // 显示编辑后的资源包
            const resource = resourceData[resourceType];
            files = resource.files;
            html = `
                <div class="resource-item ${isMobileDevice() ? 'mobile-resource' : ''}">
                    <h3>${resource.name}</h3>
                    <h4>包含文件：</h4>
                    <ul>
            `;
            
            files.forEach((file, index) => {
                // 为不同类型的文件生成不同的显示方式
                const fileExtension = file.split('.').pop().toLowerCase();
                let fileAction = '';
                
                // 尝试获取文件内容
                let fileData = null;
                if (resource.fileContents && resource.fileContents[file]) {
                    fileData = resource.fileContents[file];
                } else {
                    // 尝试不区分大小写查找
                    for (const [storedFileName, data] of Object.entries(resource.fileContents || {})) {
                        if (storedFileName.toLowerCase() === file.toLowerCase()) {
                            fileData = data;
                            break;
                        }
                    }
                }
                
                if (fileData && fileData.content) {
                    // 对于图片文件，直接显示
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewImage('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于视频文件，直接播放
                    else if (['mp4', 'avi', 'mov', 'wmv', 'webm'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="playVideo('${encodeURIComponent(file)}')">播放</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于音频文件，直接播放
                    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="playAudio('${encodeURIComponent(file)}')">播放</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于PDF文件，直接查看
                    else if (fileExtension === 'pdf') {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewPDF('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 对于文本文件，直接查看
                    else if (['txt', 'html', 'htm', 'css', 'js', 'json'].includes(fileExtension)) {
                        if (fileData.content.startsWith('data:')) {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="viewText('${encodeURIComponent(file)}')">查看</button>`;
                        } else {
                            fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                        }
                    } 
                    // 其他文件类型，提供下载
                    else {
                        fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                    }
                } else {
                    // 没有文件内容，提供下载
                    fileAction = `<button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(file)}')">下载</button>`;
                }
                
                html += `<li class="${isMobileDevice() ? 'mobile-file-item' : ''}">
                    <span>${file}</span>
                    ${fileAction}
                </li>`;
            });
            
            html += `
                    </ul>
                </div>
            `;
        } else {
            // 显示默认资源包
            files = content.items;
            html = `
                <div class="resource-item ${isMobileDevice() ? 'mobile-resource' : ''}">
                    <h3>${content.title}</h3>
                    <ul>
            `;
            
            files.forEach((item, index) => {
                html += `<li class="${isMobileDevice() ? 'mobile-file-item' : ''}">
                    <span>${item}</span>
                    <button class="btn-sm ${isMobileDevice() ? 'mobile-btn' : ''}" onclick="downloadFile('${encodeURIComponent(item)}')">下载</button>
                </li>`;
            });
            
            html += `
                    </ul>
                </div>
            `;
        }
        
        resourceContent.innerHTML = html;
        
        // 添加移动设备样式
        if (isMobileDevice()) {
            const style = document.createElement('style');
            style.textContent = `
                .mobile-resource {
                    padding: 10px;
                }
                .mobile-file-item {
                    display: block;
                    margin-bottom: 15px;
                    padding: 10px;
                    background-color: #f5f5f5;
                    border-radius: 5px;
                }
                .mobile-file-item span {
                    display: block;
                    margin-bottom: 10px;
                    font-size: 16px;
                }
                .mobile-btn {
                    padding: 12px 20px;
                    font-size: 16px;
                    margin: 5px 0;
                    width: 100%;
                    text-align: center;
                }
                .mobile-btn + .mobile-btn {
                    margin-top: 10px;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 下载单个文件
function downloadFile(fileName) {
    fileName = decodeURIComponent(fileName);
    
    console.log('开始下载文件:', fileName);
    console.log('当前角色:', currentRole);
    console.log('当前资源包标题:', window.resourcePackContent ? window.resourcePackContent.title : '无');
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    console.log('确定的资源类型:', resourceType);
    console.log('所有上传的资源包:', uploadedResources);
    
    // 查找上传的对应资源包
    let uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 查找resourceData中的对应资源包
    let defaultResource = resourceData[resourceType];
    
    console.log('找到的上传资源包:', uploadedResource);
    console.log('找到的默认资源包:', defaultResource);
    
    // 尝试从上传的资源中获取文件内容
    if (uploadedResource && uploadedResource.fileContents) {
        // 遍历fileContents，寻找匹配的文件名（不区分大小写）
        let foundFileData = null;
        for (const [storedFileName, fileData] of Object.entries(uploadedResource.fileContents)) {
            if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                foundFileData = fileData;
                break;
            }
        }
        
        if (!foundFileData) {
            // 尝试精确匹配
            foundFileData = uploadedResource.fileContents[fileName];
        }
        
        if (foundFileData) {
            const fileData = foundFileData;
            
            console.log('找到的文件数据:', fileData);
            console.log('文件类型:', fileData.type);
            console.log('文件内容长度:', fileData.content ? fileData.content.length : 0);
            console.log('文件内容是否为Data URL:', fileData.content && fileData.content.startsWith('data:'));
            
            // 检查文件内容是否有效
            if (fileData.content && fileData.content.startsWith('data:')) {
                try {
                    // 使用Data URL直接下载
                    const link = document.createElement('a');
                    link.href = fileData.content;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    alert(`文件 "${fileName}" 下载成功！`);
                    return;
                } catch (error) {
                    console.error('使用Data URL下载失败:', error);
                    // 继续使用Blob方式下载
                }
            } else if (fileData.content) {
                // 尝试将内容转换为Blob下载
                try {
                    // 检查是否是Base64编码的数据
                    let blob;
                    if (fileData.type) {
                        // 尝试从Data URL或Base64创建Blob
                        if (fileData.content.includes(',')) {
                            // 是Data URL格式
                            const [meta, base64Data] = fileData.content.split(',');
                            const binaryData = atob(base64Data);
                            const arrayBuffer = new ArrayBuffer(binaryData.length);
                            const uint8Array = new Uint8Array(arrayBuffer);
                            for (let i = 0; i < binaryData.length; i++) {
                                uint8Array[i] = binaryData.charCodeAt(i);
                            }
                            blob = new Blob([uint8Array], { type: fileData.type });
                        } else {
                            // 纯Base64编码
                            const binaryData = atob(fileData.content);
                            const arrayBuffer = new ArrayBuffer(binaryData.length);
                            const uint8Array = new Uint8Array(arrayBuffer);
                            for (let i = 0; i < binaryData.length; i++) {
                                uint8Array[i] = binaryData.charCodeAt(i);
                            }
                            blob = new Blob([uint8Array], { type: fileData.type });
                        }
                    } else {
                        // 未知类型，使用文本
                        blob = new Blob([fileData.content], { type: 'application/octet-stream' });
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    alert(`文件 "${fileName}" 下载成功！`);
                    return;
                } catch (error) {
                    console.error('使用Blob下载失败:', error);
                }
            } else {
                console.warn('文件内容为空:', fileName);
            }
        } else {
            console.warn('未找到上传的文件内容:', fileName);
            console.warn('资源包中的文件列表:', Object.keys(uploadedResource.fileContents));
        }
    } else {
        console.warn('未找到上传的资源包或资源包没有fileContents属性');
        if (!uploadedResource) {
            console.warn('未找到上传的资源包，类型:', resourceType);
        } else {
            console.warn('资源包没有fileContents属性');
        }
    }
    
    // 尝试从默认资源包中获取文件内容
    if (defaultResource && defaultResource.fileContents) {
        // 遍历fileContents，寻找匹配的文件名（不区分大小写）
        let foundFileData = null;
        for (const [storedFileName, fileData] of Object.entries(defaultResource.fileContents)) {
            if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                foundFileData = fileData;
                break;
            }
        }
        
        if (!foundFileData) {
            // 尝试精确匹配
            foundFileData = defaultResource.fileContents[fileName];
        }
        
        if (foundFileData) {
            const fileData = foundFileData;
            
            console.log('从默认资源包找到的文件数据:', fileData);
            console.log('文件类型:', fileData.type);
            console.log('文件内容长度:', fileData.content ? fileData.content.length : 0);
            console.log('文件内容是否为Data URL:', fileData.content && fileData.content.startsWith('data:'));
            
            // 检查文件内容是否有效
            if (fileData.content && fileData.content.startsWith('data:')) {
                try {
                    // 使用Data URL直接下载
                    const link = document.createElement('a');
                    link.href = fileData.content;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    alert(`文件 "${fileName}" 下载成功！`);
                    return;
                } catch (error) {
                    console.error('使用Data URL下载失败:', error);
                    // 继续使用Blob方式下载
                }
            } else if (fileData.content) {
                // 尝试将内容转换为Blob下载
                try {
                    // 检查是否是Base64编码的数据
                    let blob;
                    if (fileData.type) {
                        // 尝试从Data URL或Base64创建Blob
                        if (fileData.content.includes(',')) {
                            // 是Data URL格式
                            const [meta, base64Data] = fileData.content.split(',');
                            const binaryData = atob(base64Data);
                            const arrayBuffer = new ArrayBuffer(binaryData.length);
                            const uint8Array = new Uint8Array(arrayBuffer);
                            for (let i = 0; i < binaryData.length; i++) {
                                uint8Array[i] = binaryData.charCodeAt(i);
                            }
                            blob = new Blob([uint8Array], { type: fileData.type });
                        } else {
                            // 纯Base64编码
                            const binaryData = atob(fileData.content);
                            const arrayBuffer = new ArrayBuffer(binaryData.length);
                            const uint8Array = new Uint8Array(arrayBuffer);
                            for (let i = 0; i < binaryData.length; i++) {
                                uint8Array[i] = binaryData.charCodeAt(i);
                            }
                            blob = new Blob([uint8Array], { type: fileData.type });
                        }
                    } else {
                        // 未知类型，使用文本
                        blob = new Blob([fileData.content], { type: 'application/octet-stream' });
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    alert(`文件 "${fileName}" 下载成功！`);
                    return;
                } catch (error) {
                    console.error('使用Blob下载失败:', error);
                }
            } else {
                console.warn('文件内容为空:', fileName);
            }
        } else {
            console.warn('未找到默认资源包中的文件内容:', fileName);
            if (defaultResource.fileContents) {
                console.warn('默认资源包中的文件列表:', Object.keys(defaultResource.fileContents));
            }
        }
    } else {
        console.warn('未找到默认资源包或默认资源包没有fileContents属性');
        if (!defaultResource) {
            console.warn('未找到默认资源包，类型:', resourceType);
        } else {
            console.warn('默认资源包没有fileContents属性');
        }
    }
    
    // 如果没有上传的内容和默认内容，使用默认内容
    // 根据文件扩展名确定MIME类型
    const extension = fileName.split('.').pop().toLowerCase();
    let mimeType = 'text/plain';
    let fileContent = `这是 ${fileName} 的内容。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
    
    // 为常见文件类型设置适当的MIME类型和默认内容
    switch (extension) {
        case 'jpg':
        case 'jpeg':
            mimeType = 'image/jpeg';
            // 使用base64编码的默认图片（有效的JPEG数据）
            fileContent = atob('Qk02AAAAAAAAADYAAAAoAAAAEAAAABwAAAABAAAAAQAAAQAAAQAAAAD8/wAA/wD/AP//AAD///8AAP//AAD//wAA');
            break;
        case 'png':
            mimeType = 'image/png';
            // 使用base64编码的默认图片（有效的PNG数据）
            fileContent = atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
            break;
        case 'gif':
            mimeType = 'image/gif';
            // 使用base64编码的默认图片（有效的GIF数据）
            fileContent = atob('R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=');
            break;
        case 'pdf':
            mimeType = 'application/pdf';
            fileContent = `这是 ${fileName} PDF文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'doc':
        case 'docx':
            mimeType = 'application/msword';
            fileContent = `这是 ${fileName} 文档文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'xls':
        case 'xlsx':
            mimeType = 'application/vnd.ms-excel';
            fileContent = `这是 ${fileName} 表格文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'ppt':
        case 'pptx':
            mimeType = 'application/vnd.ms-powerpoint';
            fileContent = `这是 ${fileName} 演示文稿文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'txt':
            mimeType = 'text/plain';
            break;
        case 'html':
        case 'htm':
            mimeType = 'text/html';
            fileContent = `<html><head><title>${fileName}</title></head><body><h1>${fileName}</h1><p>这是 ${fileName} 的内容。</p><p>资源包下载自：云护童心—儿童心理健康成长调查</p></body></html>`;
            break;
        case 'css':
            mimeType = 'text/css';
            fileContent = `/* ${fileName} */\n\n/* 资源包下载自：云护童心—儿童心理健康成长调查 */`;
            break;
        case 'js':
            mimeType = 'application/javascript';
            fileContent = `// ${fileName}\n\n// 资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'mp4':
        case 'avi':
        case 'mov':
        case 'wmv':
            mimeType = 'video/mp4';
            fileContent = `这是 ${fileName} 视频文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        case 'mp3':
        case 'wav':
        case 'ogg':
            mimeType = 'audio/mpeg';
            fileContent = `这是 ${fileName} 音频文件。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            break;
        default:
            mimeType = 'text/plain';
            break;
    }
    
    try {
        // 创建Blob对象
        let blob;
        if (['image/jpeg', 'image/png', 'image/gif'].includes(mimeType)) {
            // 对于图片文件，将字符串转换为二进制数据
            const binaryData = new Uint8Array(fileContent.length);
            for (let i = 0; i < fileContent.length; i++) {
                binaryData[i] = fileContent.charCodeAt(i);
            }
            blob = new Blob([binaryData], { type: mimeType });
        } else if (mimeType.startsWith('video/')) {
            // 对于视频文件，创建文本Blob
            blob = new Blob([fileContent], { type: 'text/plain' });
        } else if (mimeType.startsWith('audio/')) {
            // 对于音频文件，创建文本Blob
            blob = new Blob([fileContent], { type: 'text/plain' });
        } else {
            // 对于其他文件，直接使用文本内容
            blob = new Blob([fileContent], { type: mimeType });
        }
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`文件 "${fileName}" 下载成功！`);
    } catch (error) {
        console.error('创建和下载Blob失败:', error);
        // 最后的备用方案：使用简单的文本文件
        try {
            const textContent = `文件下载失败，这是 ${fileName} 的默认内容。\n\n资源包下载自：云护童心—儿童心理健康成长调查`;
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName.replace(/\.[^/.]+$/, '') + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`文件 "${fileName}" 下载失败，已提供默认内容！`);
        } catch (innerError) {
            console.error('备用下载方案也失败:', innerError);
            alert(`文件 "${fileName}" 下载失败，请稍后重试！`);
        }
    }
}

// 下载整个资源包
function downloadResourcePack(resourceType) {
    let resource;
    let files = [];
    
    // 查找上传的资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    if (uploadedResource) {
        resource = uploadedResource;
        files = uploadedResource.files;
    } else if (resourceType && resourceData[resourceType]) {
        // 查找编辑后的资源包
        resource = resourceData[resourceType];
        files = resource.files;
    } else {
        // 使用默认资源包
        resource = window.resourcePackContent;
        files = resource.items;
    }
    
    if (files && files.length > 0) {
        // 为每个文件创建下载链接
        files.forEach(file => {
            downloadFile(encodeURIComponent(file));
        });
        
        alert(`资源包 "${resource.name}" 中的所有文件已开始下载！`);
    } else {
        alert('资源包中暂无文件！');
    }
}

// 查看图片文件
function viewImage(fileName) {
    fileName = decodeURIComponent(fileName);
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 尝试获取文件内容
    let fileData = null;
    if (uploadedResource && uploadedResource.fileContents) {
        if (uploadedResource.fileContents[fileName]) {
            fileData = uploadedResource.fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    // 如果没有找到，尝试从默认资源包中查找
    if (!fileData && resourceType && resourceData[resourceType] && resourceData[resourceType].fileContents) {
        if (resourceData[resourceType].fileContents[fileName]) {
            fileData = resourceData[resourceType].fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(resourceData[resourceType].fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    if (fileData && fileData.content && fileData.content.startsWith('data:')) {
        // 创建图片查看模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const img = document.createElement('img');
        img.src = fileData.content;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            position: absolute;
            top: ${isMobileDevice() ? '40px' : '20px'};
            right: ${isMobileDevice() ? '20px' : '20px'};
            background-color: white;
            color: black;
            border: none;
            padding: ${isMobileDevice() ? '15px 25px' : '10px 20px'};
            border-radius: 5px;
            cursor: pointer;
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        modal.appendChild(img);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    } else {
        alert('无法查看图片文件，请尝试下载。');
    }
}

// 播放视频文件
function playVideo(fileName) {
    fileName = decodeURIComponent(fileName);
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 尝试获取文件内容
    let fileData = null;
    if (uploadedResource && uploadedResource.fileContents) {
        if (uploadedResource.fileContents[fileName]) {
            fileData = uploadedResource.fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    // 如果没有找到，尝试从默认资源包中查找
    if (!fileData && resourceType && resourceData[resourceType] && resourceData[resourceType].fileContents) {
        if (resourceData[resourceType].fileContents[fileName]) {
            fileData = resourceData[resourceType].fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(resourceData[resourceType].fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    if (fileData && fileData.content && fileData.content.startsWith('data:')) {
        // 创建视频播放模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const video = document.createElement('video');
        video.src = fileData.content;
        video.controls = true;
        video.style.cssText = `
            max-width: 90%;
            max-height: 80%;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: ${isMobileDevice() ? '30px' : '20px'};
            background-color: white;
            color: black;
            border: none;
            padding: ${isMobileDevice() ? '15px 25px' : '10px 20px'};
            border-radius: 5px;
            cursor: pointer;
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        modal.appendChild(video);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    } else {
        alert('无法播放视频文件，请尝试下载。');
    }
}

// 播放音频文件
function playAudio(fileName) {
    fileName = decodeURIComponent(fileName);
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 尝试获取文件内容
    let fileData = null;
    if (uploadedResource && uploadedResource.fileContents) {
        if (uploadedResource.fileContents[fileName]) {
            fileData = uploadedResource.fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    // 如果没有找到，尝试从默认资源包中查找
    if (!fileData && resourceType && resourceData[resourceType] && resourceData[resourceType].fileContents) {
        if (resourceData[resourceType].fileContents[fileName]) {
            fileData = resourceData[resourceType].fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(resourceData[resourceType].fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    if (fileData && fileData.content && fileData.content.startsWith('data:')) {
        // 创建音频播放模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const audio = document.createElement('audio');
        audio.src = fileData.content;
        audio.controls = true;
        audio.style.cssText = `
            margin-bottom: ${isMobileDevice() ? '30px' : '20px'};
        `;
        
        const fileNameElement = document.createElement('h3');
        fileNameElement.textContent = fileName;
        fileNameElement.style.cssText = `
            color: white;
            margin-bottom: ${isMobileDevice() ? '30px' : '20px'};
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            background-color: white;
            color: black;
            border: none;
            padding: ${isMobileDevice() ? '15px 25px' : '10px 20px'};
            border-radius: 5px;
            cursor: pointer;
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        modal.appendChild(fileNameElement);
        modal.appendChild(audio);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    } else {
        alert('无法播放音频文件，请尝试下载。');
    }
}

// 查看PDF文件
function viewPDF(fileName) {
    fileName = decodeURIComponent(fileName);
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 尝试获取文件内容
    let fileData = null;
    if (uploadedResource && uploadedResource.fileContents) {
        if (uploadedResource.fileContents[fileName]) {
            fileData = uploadedResource.fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    // 如果没有找到，尝试从默认资源包中查找
    if (!fileData && resourceType && resourceData[resourceType] && resourceData[resourceType].fileContents) {
        if (resourceData[resourceType].fileContents[fileName]) {
            fileData = resourceData[resourceType].fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(resourceData[resourceType].fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    if (fileData && fileData.content && fileData.content.startsWith('data:')) {
        // 创建PDF查看模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const iframe = document.createElement('iframe');
        iframe.src = fileData.content;
        iframe.style.cssText = `
            width: 90%;
            height: 80%;
            border: none;
            border-radius: 5px;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: ${isMobileDevice() ? '30px' : '20px'};
            background-color: white;
            color: black;
            border: none;
            padding: ${isMobileDevice() ? '15px 25px' : '10px 20px'};
            border-radius: 5px;
            cursor: pointer;
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        modal.appendChild(iframe);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    } else {
        alert('无法查看PDF文件，请尝试下载。');
    }
}

// 查看文本文件
function viewText(fileName) {
    fileName = decodeURIComponent(fileName);
    
    // 确定资源类型
    let resourceType = '';
    if (currentRole === 'student') {
        if (window.resourcePackContent && window.resourcePackContent.title.includes('阳光开朗')) {
            resourceType = 'sunny';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('内敛害羞')) {
            resourceType = 'introverted';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('孤独疏离')) {
            resourceType = 'lonely';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('压力焦虑')) {
            resourceType = 'anxious';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('乐观自愈')) {
            resourceType = 'optimistic';
        } else if (window.resourcePackContent && window.resourcePackContent.title.includes('矛盾纠结')) {
            resourceType = 'conflicted';
        }
    }
    
    // 查找上传的对应资源包
    const uploadedResource = uploadedResources.find(r => r.type === resourceType);
    
    // 尝试获取文件内容
    let fileData = null;
    if (uploadedResource && uploadedResource.fileContents) {
        if (uploadedResource.fileContents[fileName]) {
            fileData = uploadedResource.fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(uploadedResource.fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    // 如果没有找到，尝试从默认资源包中查找
    if (!fileData && resourceType && resourceData[resourceType] && resourceData[resourceType].fileContents) {
        if (resourceData[resourceType].fileContents[fileName]) {
            fileData = resourceData[resourceType].fileContents[fileName];
        } else {
            // 尝试不区分大小写查找
            for (const [storedFileName, data] of Object.entries(resourceData[resourceType].fileContents)) {
                if (storedFileName.toLowerCase() === fileName.toLowerCase()) {
                    fileData = data;
                    break;
                }
            }
        }
    }
    
    if (fileData && fileData.content) {
        // 提取文本内容
        let textContent = '';
        if (fileData.content.startsWith('data:')) {
            // 从Data URL中提取文本内容
            try {
                // 尝试直接提取文本内容，不使用复杂的解码
                const content = fileData.content;
                // 检查是否包含逗号
                if (content.includes(',')) {
                    // 分割Data URL
                    const [meta, data] = content.split(',');
                    // 尝试不同的解码方法
                    try {
                        // 方法1：直接使用atob解码
                        const decoded = atob(data);
                        textContent = decoded;
                    } catch (e) {
                        console.error('直接解码失败:', e);
                        // 方法2：尝试使用TextDecoder
                        try {
                            const binaryData = atob(data);
                            const uint8Array = new Uint8Array(binaryData.length);
                            for (let i = 0; i < binaryData.length; i++) {
                                uint8Array[i] = binaryData.charCodeAt(i);
                            }
                            const decoder = new TextDecoder('utf-8');
                            textContent = decoder.decode(uint8Array);
                        } catch (e2) {
                            console.error('TextDecoder解码失败:', e2);
                            // 方法3：如果都失败，直接显示原始数据的一部分
                            textContent = '解码失败，显示原始数据前1000字符：' + data.substring(0, 1000);
                        }
                    }
                } else {
                    // 不是标准的Data URL格式
                    textContent = content;
                }
            } catch (error) {
                console.error('解码文本失败:', error);
                textContent = '解码失败，请尝试下载文件。\n错误信息：' + error.message;
            }
        } else {
            // 直接使用文件内容
            textContent = fileData.content;
        }
        
        console.log('文本内容长度:', textContent.length);
        console.log('文本内容前100字符:', textContent.substring(0, 100));
        
        // 创建文本查看模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = `
            width: 90%;
            height: 80%;
            background-color: white;
            border-radius: 5px;
            padding: ${isMobileDevice() ? '20px' : '20px'};
            overflow: auto;
        `;
        
        const fileNameElement = document.createElement('h3');
        fileNameElement.textContent = fileName;
        fileNameElement.style.cssText = `
            margin-top: 0;
            margin-bottom: ${isMobileDevice() ? '30px' : '20px'};
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        
        // 使用textarea而不是pre标签，这样用户可以更容易地复制文本
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        textArea.style.cssText = `
            width: 100%;
            height: calc(100% - 40px);
            margin: 0;
            padding: 10px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 3px;
            overflow: auto;
            font-family: monospace;
            font-size: ${isMobileDevice() ? '16px' : '14px'};
            resize: none;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = `
            margin-top: ${isMobileDevice() ? '30px' : '20px'};
            background-color: white;
            color: black;
            border: none;
            padding: ${isMobileDevice() ? '15px 25px' : '10px 20px'};
            border-radius: 5px;
            cursor: pointer;
            font-size: ${isMobileDevice() ? '18px' : '16px'};
        `;
        closeBtn.onclick = function() {
            document.body.removeChild(modal);
        };
        
        container.appendChild(fileNameElement);
        container.appendChild(textArea);
        modal.appendChild(container);
        modal.appendChild(closeBtn);
        document.body.appendChild(modal);
    } else {
        alert('无法查看文本文件，请尝试下载。');
    }
}

// 显示指定模块
function showModule(moduleId) {
    // 隐藏所有模块
    const modules = document.querySelectorAll('.module');
    modules.forEach(module => {
        module.classList.remove('active');
    });
    
    // 显示指定模块
    document.getElementById(moduleId).classList.add('active');
    
    // 如果是资源包模块，显示资源包内容
    if (moduleId === 'resource-module') {
        showResourcePack();
    }
}

// 退出登录
function logout() {
    currentUser = null;
    currentRole = null;
    currentSurveyType = null;
    currentSection = 0;
    studentAnswers = {};
    
    // 重置登录表单
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    
    // 显示认证模块
    showModule('auth-module');
}

// 保存学生答案


// 移动端设备检测函数
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 关键资源预加载函数
async function preloadCriticalResources() {
    try {
        console.log('开始预加载关键资源...');
        
        // 获取所有资源包
        const resources = uploadedResources || [];
        
        // 预加载前几个关键资源包
        const criticalTypes = ['student', 'teacher'];
        
        for (const type of criticalTypes) {
            const resource = resources.find(r => r.type === type);
            if (resource) {
                console.log(`预加载资源包: ${type}`);
                // 对于每个文件，确保其内容已经加载到内存中
                for (const file of resource.files || []) {
                    try {
                        // 尝试获取文件内容
                        const fileContent = await getFileContent(file, type);
                        if (fileContent) {
                            console.log(`预加载文件: ${file}`);
                        }
                    } catch (error) {
                        console.error(`预加载文件 ${file} 失败:`, error);
                    }
                }
            }
        }
        
        console.log('关键资源预加载完成');
    } catch (error) {
        console.error('预加载关键资源失败:', error);
    }
}

// 获取文件内容的辅助函数
async function getFileContent(fileName, resourceType) {
    try {
        // 首先尝试从上传的资源包中获取
        const resource = uploadedResources.find(r => r.type === resourceType);
        if (resource && resource.fileContents) {
            // 不区分大小写查找文件
            const matchedFileName = Object.keys(resource.fileContents).find(
                key => key.toLowerCase() === fileName.toLowerCase()
            );
            if (matchedFileName) {
                return resource.fileContents[matchedFileName];
            }
        }
        
        // 尝试从默认资源包中获取
        const defaultResource = resourceData[resourceType];
        if (defaultResource && defaultResource.fileContents) {
            // 不区分大小写查找文件
            const matchedFileName = Object.keys(defaultResource.fileContents).find(
                key => key.toLowerCase() === fileName.toLowerCase()
            );
            if (matchedFileName) {
                return defaultResource.fileContents[matchedFileName];
            }
        }
        
        return null;
    } catch (error) {
        console.error('获取文件内容失败:', error);
        return null;
    }
}