document.addEventListener('DOMContentLoaded', () => {

    // ============ 语言切换功能 ============
    const translations = {
        zh: {
            appTitle: '我的情绪',
            moodStatus: '平静',
            moodPrompt: '深呼吸, 把这一刻收藏起来。',
            selectDate: '选择一个日期',
            weekdays: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
            monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            heartRate: '心率',
            respirationRate: '呼吸率',
            myHealth: '我的健康',
            stressLevel: '压力水平',
            recovery: '压力调节恢复能力',
            balance: '自主神经平衡',
            activity: '自主神经活性',
            emotions: {
                Joy: '欢乐',
                Tense: '紧张',
                Low: '低落',
                Calm: '平静',
                Neutral: '中性'
            },
            prompts: {
                Joy: '享受这美好的时刻！',
                Tense: '深呼吸，放松一下。',
                Low: '给自己一些时间休息。',
                Calm: '深呼吸, 把这一刻收藏起来。',
                Neutral: '保持当前状态。'
            }
        },
        en: {
            appTitle: 'My Mood',
            moodStatus: 'Calm',
            moodPrompt: 'Take a deep breath and treasure this moment.',
            selectDate: 'Select a date',
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'],
            heartRate: 'Heart Rate',
            respirationRate: 'Respiration Rate',
            myHealth: 'My Health',
            stressLevel: 'Stress Level',
            recovery: 'Recovery Ability',
            balance: 'Autonomic Balance',
            activity: 'Autonomic Activity',
            emotions: {
                Joy: 'Joy',
                Tense: 'Tense',
                Low: 'Low',
                Calm: 'Calm',
                Neutral: 'Neutral'
            },
            prompts: {
                Joy: 'Enjoy this wonderful moment!',
                Tense: 'Take a deep breath and relax.',
                Low: 'Give yourself some time to rest.',
                Calm: 'Take a deep breath and treasure this moment.',
                Neutral: 'Stay in the moment.'
            }
        }
    };

    let currentLang = localStorage.getItem('language') || 'zh';

    function switchLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('language', lang);
        const t = translations[lang];

        // 更新页面文本
        document.getElementById('app-title').textContent = t.appTitle;
        document.querySelector('.mood-text h2').textContent = t.moodStatus;
        document.querySelector('.mood-prompt').textContent = t.moodPrompt;
        document.getElementById('selected-date-display').textContent = t.selectDate;
        document.querySelector('.modal-title').textContent = t.myHealth;

        // 更新星期标题
        const weekdayElements = document.querySelectorAll('.weekday');
        weekdayElements.forEach((el, idx) => {
            el.textContent = t.weekdays[idx];
        });

        // 更新图表标题
        const chartTitles = document.querySelectorAll('.chart-header h3');
        if (chartTitles.length >= 2) {
            chartTitles[0].textContent = t.heartRate;
            chartTitles[1].textContent = t.respirationRate;
        }

        // 更新健康卡片标题
        const healthCards = document.querySelectorAll('.health-card');
        if (healthCards.length >= 4) {
            healthCards[0].querySelector('h3').textContent = t.stressLevel;
            healthCards[1].querySelector('h3').textContent = t.recovery;
            healthCards[2].querySelector('h3').textContent = t.balance;
            healthCards[3].querySelector('h3').textContent = t.activity;
        }

        // 如果 updateCalendar 已定义，则更新日历
        if (typeof updateCalendar === 'function') {
            updateCalendar();
        }
    }

    // ============ 开屏页功能 ============
    const splashScreen = document.getElementById('splash-screen');
    
    // 500毫秒后开始淡出动画
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        
        // 淡出动画结束后移除开屏页元素
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500); // 与CSS中的transition时间一致
    }, 500);

    // ============ 日历功能 ============
    let currentDate = new Date();
    let selectedDate = null;

    // 模拟的心情数据（后续可以从API获取）
    const moodData = {
        // 格式: 'YYYY-MM-DD': { moods: [{time: hour, mood: 'green/yellow/pink/blue'}] }
    };

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // 更新月份显示（使用当前语言）
        const t = translations[currentLang];
        const monthName = t.monthNames[month];
        if (currentLang === 'zh') {
            document.getElementById('current-month').textContent = `${year}年${monthName}`;
        } else {
            document.getElementById('current-month').textContent = `${monthName} ${year}`;
        }
        
        // 获取本月第一天是星期几
        const firstDay = new Date(year, month, 1).getDay();
        // 获取本月有多少天
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // 获取上个月有多少天
        const prevMonthDays = new Date(year, month, 0).getDate();
        
        const calendarGrid = document.getElementById('calendar-grid');
        // 清空现有的日期（保留星期标题）
        const weekdays = calendarGrid.querySelectorAll('.weekday');
        calendarGrid.innerHTML = '';
        weekdays.forEach(day => calendarGrid.appendChild(day));
        
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();
        
        // 计算本周的日期范围
        const todayDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - todayDayOfWeek);
        weekStart.setHours(0, 0, 0, 0); // 设置为当天开始
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999); // 设置为当天结束
        
        // 添加上个月的日期（填充空白）
        for (let i = firstDay - 1; i >= 0; i--) {
            const prevDay = prevMonthDays - i;
            const prevMonth = month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const actualPrevMonth = month === 0 ? 11 : prevMonth;
            const dayCell = createDayCell(prevDay, 'other-month');
            
            // 检查上个月的日期是否在本周范围内
            const cellDate = new Date(prevYear, actualPrevMonth, prevDay);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate >= weekStart && cellDate <= weekEnd) {
                dayCell.classList.add('current-week');
            }
            
            calendarGrid.appendChild(dayCell);
        }
        
        // 添加本月的日期
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayCell = createDayCell(day, '', dateStr);
            
            // 检查是否在本周范围内
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate >= weekStart && cellDate <= weekEnd) {
                dayCell.classList.add('current-week');
            }
            
            // 标记今天
            if (isCurrentMonth && day === todayDate) {
                dayCell.classList.add('today');
            }
            
            // 添加心情指示点（模拟数据）
            if (moodData[dateStr]) {
                const dot = document.createElement('span');
                const moodColors = ['green', 'yellow', 'pink', 'blue'];
                const randomMood = moodColors[Math.floor(Math.random() * moodColors.length)];
                dot.className = `dot ${randomMood}`;
                dayCell.appendChild(dot);
            }
            
            calendarGrid.appendChild(dayCell);
        }
        
        // 添加下个月的日期（填充剩余空间）
        const totalCells = calendarGrid.children.length - 7; // 减去星期标题
        const remainingCells = 35 - totalCells; // 5周 * 7天 = 35个格子
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const actualNextMonth = month === 11 ? 0 : nextMonth;
            const dayCell = createDayCell(day, 'other-month');
            
            // 检查下个月的日期是否在本周范围内
            const cellDate = new Date(nextYear, actualNextMonth, day);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate >= weekStart && cellDate <= weekEnd) {
                dayCell.classList.add('current-week');
            }
            
            calendarGrid.appendChild(dayCell);
        }
    }

    function createDayCell(day, className = '', dateStr = '') {
        const cell = document.createElement('div');
        cell.className = `day-cell ${className}`;
        
        // 如果有dateStr，添加星期信息（用于折叠视图）
        if (dateStr) {
            const date = new Date(dateStr);
            const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            // 创建日期容器
            const dayNumber = document.createElement('span');
            dayNumber.textContent = day;
            dayNumber.className = 'day-number';
            
            // 创建星期容器（仅在折叠视图中显示）
            const weekdayLabel = document.createElement('span');
            weekdayLabel.textContent = weekdayShort[date.getDay()];
            weekdayLabel.className = 'weekday-label';
            
            cell.appendChild(weekdayLabel);
            cell.appendChild(dayNumber);
            cell.dataset.date = dateStr;
            cell.addEventListener('click', () => selectDate(dateStr, cell));
        } else {
            cell.textContent = day;
        }
        
        return cell;
    }

    function selectDate(dateStr, cellElement) {
        // 移除之前选中的样式
        document.querySelectorAll('.day-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        // 添加选中样式
        cellElement.classList.add('selected');
        selectedDate = dateStr;
        
        // 更新日期显示
        const date = new Date(dateStr);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        document.getElementById('selected-date-display').textContent = 
            `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        // 更新时间线
        updateTimeline(dateStr);
    }

    function updateTimeline(dateStr) {
        const timelineBar = document.getElementById('timeline-bar');
        timelineBar.innerHTML = '';
        
        // 模拟当天的心情数据（后续从API获取）
        // 格式: [{hour: 8, mood: 'green'}, {hour: 14, mood: 'yellow'}, {hour: 20, mood: 'pink'}]
        const dayMoods = generateMockMoodData();
        
        dayMoods.forEach(mood => {
            const dot = document.createElement('span');
            dot.className = `dot ${mood.mood}`;
            // 将小时转换为百分比位置 (0-24小时 -> 0-100%)
            const position = (mood.hour / 24) * 100;
            dot.style.left = `${position}%`;
            timelineBar.appendChild(dot);
        });
    }

    function generateMockMoodData() {
        // 生成更密集的心情点，主要集中在工作时间段（8:00-18:00）
        const moodColors = ['green', 'yellow', 'pink', 'blue'];
        const moods = [];
        
        // 工作时间段（8:00-18:00）生成10-15个点
        const workTimeCount = Math.floor(Math.random() * 6) + 10; // 10-15个
        for (let i = 0; i < workTimeCount; i++) {
            // 在8-18小时之间生成随机时间（包含小数以增加密集度）
            const hour = 8 + Math.random() * 16; // 8.0 - 18.0
            moods.push({
                hour: hour,
                mood: moodColors[Math.floor(Math.random() * moodColors.length)]
            });
        }
        // 按时间排序
        return moods.sort((a, b) => a.hour - b.hour);
    }

    // 月份切换
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // 日历展开/折叠功能
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarToggle = document.getElementById('calendar-toggle');
    
    calendarToggle.addEventListener('click', () => {
        calendarGrid.classList.toggle('expanded');
        calendarToggle.classList.toggle('expanded');
    });

    // 初始化日历
    updateCalendar();

    // ============ 时间更新 ============
    function updateTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[now.getMonth()];
        const day = now.getDate();
        
        const timeString = `${hours}:${minutes}, ${month} ${day}`;
        document.getElementById('current-time').textContent = timeString;
    }
    
    updateTime();
    setInterval(updateTime, 1000);

    // ============ 心率/呼吸率弹窗 ============
    const modal = document.getElementById('data-modal');
    const openBtn = document.getElementById('open-modal-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const mainContent = document.getElementById('main-content');

    let modalHrChart = null;
    let modalBrChart = null;

    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        mainContent.style.filter = 'blur(5px)';
        if (!modalHrChart) {
            initializeModalCharts();
        }
    });

    const closeModal = () => {
        modal.style.display = 'none';
        mainContent.style.filter = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    // ============ 健康指标四宫格弹窗 ============
    const healthModal = document.getElementById('health-modal');
    const openHealthBtn = document.getElementById('open-health-modal-btn');
    const closeHealthBtn = document.getElementById('close-health-modal-btn');
    let balanceChart = null;

    openHealthBtn.addEventListener('click', () => {
        healthModal.style.display = 'flex';
        mainContent.style.filter = 'blur(5px)';
        if (!balanceChart) {
            initializeBalanceChart();
        }
    });

    const closeHealthModal = () => {
        healthModal.style.display = 'none';
        mainContent.style.filter = 'none';
    };

    closeHealthBtn.addEventListener('click', closeHealthModal);
    healthModal.addEventListener('click', (event) => {
        if (event.target === healthModal) {
            closeHealthModal();
        }
    });

    // ============ 情绪图谱弹窗 ============
    const emotionMapModal = document.getElementById('emotion-map-modal');
    const openEmotionMapBtn = document.getElementById('open-emotion-map-btn');
    const closeEmotionMapBtn = document.getElementById('close-emotion-map-btn');
    
    openEmotionMapBtn.addEventListener('click', () => {
        emotionMapModal.style.display = 'flex';
        mainContent.style.filter = 'blur(5px)';
        drawEmotionMap();
    });

    const closeEmotionMapModal = () => {
        emotionMapModal.style.display = 'none';
        mainContent.style.filter = 'none';
    };

    closeEmotionMapBtn.addEventListener('click', closeEmotionMapModal);
    emotionMapModal.addEventListener('click', (event) => {
        if (event.target === emotionMapModal) {
            closeEmotionMapModal();
        }
    });

    // 绘制情绪图谱
    function drawEmotionMap() {
        const canvas = document.getElementById('emotion-map-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight);
        
        canvas.width = size;
        canvas.height = size;
        
        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = size / 2 - 20;
        
        // 清空画布
        ctx.clearRect(0, 0, size, size);
        
        // 绘制渐变背景 - 模拟情绪色彩
        // 随机生成一些情绪数据点
        const emotionPoints = [];
        const numPoints = 20 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints + Math.random() * 0.3;
            const radius = maxRadius * (0.3 + Math.random() * 0.7);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            // 随机选择情绪颜色
            const colors = [
                { r: 255, g: 215, b: 0, a: 0.6 },    // Joy - 金黄色
                { r: 255, g: 107, b: 107, a: 0.6 },  // Tense - 红色
                { r: 135, g: 206, b: 235, a: 0.6 },  // Low - 天蓝色
                { r: 144, g: 238, b: 144, a: 0.6 },  // Calm - 浅绿色
                { r: 192, g: 192, b: 192, a: 0.4 }   // Neutral - 灰色
            ];
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            emotionPoints.push({ x, y, color, size: 60 + Math.random() * 100 });
        }
        
        // 绘制模糊的情绪色块
        emotionPoints.forEach(point => {
            const gradient = ctx.createRadialGradient(
                point.x, point.y, 0,
                point.x, point.y, point.size
            );
            
            gradient.addColorStop(0, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${point.color.a})`);
            gradient.addColorStop(0.5, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, ${point.color.a * 0.5})`);
            gradient.addColorStop(1, `rgba(${point.color.r}, ${point.color.g}, ${point.color.b}, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, size, size);
        });
        
        // 应用高斯模糊效果
        ctx.filter = 'blur(30px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        
        // 绘制外圈
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制中圈
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制内圈
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 生成情绪时间线
    function generateEmotionTimeline() {
        const timelineDots = document.getElementById('emotion-timeline-dots');
        if (!timelineDots) return;
        
        timelineDots.innerHTML = '';
        
        // 随机生成一天的情绪数据点
        const emotions = ['joy', 'tense', 'low', 'calm', 'neutral'];
        const numDots = 8 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('div');
            dot.className = `timeline-dot ${emotions[Math.floor(Math.random() * emotions.length)]}`;
            
            // 随机位置 (0-100%)
            const position = (i / numDots) * 95 + Math.random() * 3;
            dot.style.left = `${position}%`;
            
            timelineDots.appendChild(dot);
        }
    }

    closeHealthBtn.addEventListener('click', closeHealthModal);
    healthModal.addEventListener('click', (event) => {
        if (event.target === healthModal) {
            closeHealthModal();
        }
    });

    function initializeBalanceChart() {
        const chartDom = document.getElementById('balance-chart');
        balanceChart = echarts.init(chartDom);
        const option = {
            series: [{
                type: 'gauge',
                radius: '100%',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: 10,
                splitNumber: 5,
                axisLine: {
                    lineStyle: {
                        width: 8,
                        color: [[0.3, '#4facfe'], [0.7, '#27ae60'], [1, '#e74c3c']]
                    }
                },
                pointer: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                detail: { show: false },
                data: [{ value: 0 }]
            }]
        };
        balanceChart.setOption(option);
    }

    function initializeModalCharts() {
        const hrChartDom = document.getElementById('modal-hr-chart');
        const brChartDom = document.getElementById('modal-br-chart');
        modalHrChart = echarts.init(hrChartDom);
        modalBrChart = echarts.init(brChartDom);
        const hrOption = {
            title: { text: '心率监测', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 30, top: 50, bottom: 30, containLabel: true }, /* 减小底部边距 */
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                axisLabel: { 
                    show: false  /* 隐藏横坐标数值 */
                },
                axisTick: {
                    show: false  /* 隐藏刻度线 */
                }
            },
            yAxis: { 
                type: 'value', 
                name: 'BPM', 
                nameLocation: 'middle',
                nameGap: 40,
                splitNumber: 4,  /* 只显示4-5个刻度 */
                axisLabel: { formatter: (v) => Math.round(Number(v)) } 
            },
            series: [{ type: 'line', showSymbol: false, smooth: true, lineStyle: { width: 2, color: '#f5576c' }, areaStyle: { opacity: 0.15, color: '#f5576c' }, data: [] }]
        };
        const brOption = {
            title: { text: '呼吸率监测', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 30, top: 50, bottom: 30, containLabel: true }, /* 减小底部边距 */
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                axisLabel: { 
                    show: false  /* 隐藏横坐标数值 */
                },
                axisTick: {
                    show: false  /* 隐藏刻度线 */
                }
            },
            yAxis: { 
                type: 'value', 
                name: 'RPM', 
                nameLocation: 'middle',
                nameGap: 40,
                splitNumber: 4,  /* 只显示4-5个刻度 */
                axisLabel: { formatter: (v) => Math.round(Number(v)) } 
            },
            series: [{ type: 'line', showSymbol: false, smooth: true, lineStyle: { width: 2, color: '#00f2fe' }, areaStyle: { opacity: 0.15, color: '#00f2fe' }, data: [] }]
        };
        modalHrChart.setOption(hrOption);
        modalBrChart.setOption(brOption);
        window.modalCharts = { hr: modalHrChart, br: modalBrChart };
    }

    // ============ 数据更新逻辑（整合自 app.js）============
    
    function safeArray(a) { 
        return Array.isArray(a) ? a : []; 
    }

    function updateModalCharts(state) {
        const t = safeArray(state.time);
        const hr = safeArray(state.hr);
        const br = safeArray(state.br);
        
        // 固定显示最近30个数据点（约30秒）
        const maxPoints = 30;
        const startIdx = Math.max(0, t.length - maxPoints);
        
        // 截取最近的数据
        const tSliced = t.slice(startIdx);
        const hrSliced = hr.slice(startIdx);
        const brSliced = br.slice(startIdx);
        
        // 将时间转换为相对时间（从0开始）
        const tStr = tSliced.map((time, idx) => String(idx));
        
        // 更新弹窗中的图表（如果已初始化）
        if (modalHrChart && modalBrChart) {
            modalHrChart.setOption({ 
                xAxis: { 
                    data: tStr,
                    min: 0,
                    max: maxPoints - 1
                }, 
                series: [{ data: hrSliced }] 
            });
            modalBrChart.setOption({ 
                xAxis: { 
                    data: tStr,
                    min: 0,
                    max: maxPoints - 1
                }, 
                series: [{ data: brSliced }] 
            });
        }
    }

    function updateHealthCards(state) {
        // 更新抗压水平 (SDNN)
        const sdnn = safeArray(state.sdnn);
        if (sdnn.length > 0) {
            const sdnnValue = Math.round(sdnn[sdnn.length - 1]);
            document.getElementById('stress-level-value').textContent = sdnnValue;
        }

        // 更新压力调节恢复能力 (valence_score) - 归一化为百分比
        if (state.valence_score !== null && state.valence_score !== undefined) {
            // 假设valence_score范围是0-1，转换为百分比
            state.valence_score = (state.valence_score + 3)/6
            const valencePercent = Math.round(state.valence_score * 100);
            document.getElementById('recovery-value').textContent = valencePercent + '%';
        } else {
            document.getElementById('recovery-value').textContent = '--';
        }

        // 更新自主神经平衡 (LF/HF Ratio)
        const ratio = safeArray(state.lf_hf);
        if (ratio.length > 0) {
            const ratioValue = Number(ratio[ratio.length - 1]).toFixed(2);
            document.getElementById('balance-value').textContent = ratioValue;
            
            // 更新仪表盘
            if (balanceChart) {
                balanceChart.setOption({
                    series: [{
                        data: [{ value: Math.min(ratioValue, 10) }]
                    }]
                });
            }
        }

        // 更新自主神经活性 (arousal_score) - 归一化为百分比
        if (state.arousal_score !== null && state.arousal_score !== undefined) {
            // 假设arousal_score范围是0-1，转换为百分比
            state.arousal_score = (state.arousal_score + 3)/6
            const arousalPercent = Math.round(state.arousal_score * 100);
            document.getElementById('activity-value').textContent = arousalPercent + '%';
        } else {
            document.getElementById('activity-value').textContent = '--';
        }
    }

    function updateMoodStatus(state) {
        // 更新情绪状态显示
        if (state.emotion_state && state.emotion_state !== null) {
            const emotionState = state.emotion_state;
            const t = translations[currentLang];
            
            // 更新文字
            const moodText = t.emotions[emotionState] || emotionState;
            document.querySelector('.mood-text h2').textContent = moodText;
            
            // 更新提示文字
            const promptText = t.prompts[emotionState] || t.moodPrompt;
            document.querySelector('.mood-prompt').textContent = promptText;
            
            // 移除所有情绪状态类
            const moodVisual = document.querySelector('.mood-visual');
            moodVisual.classList.remove('mood-joy', 'mood-tense', 'mood-low', 'mood-calm', 'mood-neutral');
            
            // 添加对应的情绪状态类
            moodVisual.classList.add(`mood-${emotionState.toLowerCase()}`);
        }
    }

    async function fetchState() {
        try {
            const res = await fetch('/api/state', { cache: 'no-cache' });
            const json = await res.json();
            updateModalCharts(json);
            updateHealthCards(json);
            updateMoodStatus(json);
        } catch (e) {
            console.error('获取数据失败:', e);
        }
    }

    // 开始定期获取数据
    fetchState();
    setInterval(fetchState, 1000);

    // 窗口大小改变时调整图表
    window.addEventListener('resize', () => {
        if (modalHrChart) modalHrChart.resize();
        if (modalBrChart) modalBrChart.resize();
        if (balanceChart) balanceChart.resize();
    });

    // ============ 初始化语言功能（放在最后） ============
    // 语言切换按钮
    document.getElementById('lang-toggle-btn').addEventListener('click', () => {
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        switchLanguage(newLang);
    });

    // 初始化语言
    switchLanguage(currentLang);

});
