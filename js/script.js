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
            recovery: '恢复能力',
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

        // 更新健康卡片标题 (如果有需要)
        // 注意：新版设计中直接在HTML里写了，如果需要完全国际化，这里需要增加对应的id
        
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
    const moodData = {};

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const t = translations[currentLang];
        const monthName = t.monthNames[month];
        if (currentLang === 'zh') {
            document.getElementById('current-month').textContent = `${year}年${monthName}`;
        } else {
            document.getElementById('current-month').textContent = `${monthName} ${year}`;
        }
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        
        const calendarGrid = document.getElementById('calendar-grid');
        const weekdays = calendarGrid.querySelectorAll('.weekday');
        calendarGrid.innerHTML = '';
        weekdays.forEach(day => calendarGrid.appendChild(day));
        
        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
        const todayDate = today.getDate();
        
        const todayDayOfWeek = today.getDay();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - todayDayOfWeek);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const prevDay = prevMonthDays - i;
            const prevMonth = month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const actualPrevMonth = month === 0 ? 11 : prevMonth;
            const dayCell = createDayCell(prevDay, 'other-month');
            
            const cellDate = new Date(prevYear, actualPrevMonth, prevDay);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate >= weekStart && cellDate <= weekEnd) {
                dayCell.classList.add('current-week');
            }
            
            calendarGrid.appendChild(dayCell);
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayCell = createDayCell(day, '', dateStr);
            
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0);
            if (cellDate >= weekStart && cellDate <= weekEnd) {
                dayCell.classList.add('current-week');
            }
            
            if (isCurrentMonth && day === todayDate) {
                dayCell.classList.add('today');
            }
            
            if (moodData[dateStr]) {
                const dot = document.createElement('span');
                const moodColors = ['green', 'yellow', 'pink', 'blue'];
                const randomMood = moodColors[Math.floor(Math.random() * moodColors.length)];
                dot.className = `dot ${randomMood}`;
                dayCell.appendChild(dot);
            }
            
            calendarGrid.appendChild(dayCell);
        }
        
        const totalCells = calendarGrid.children.length - 7;
        const remainingCells = 35 - totalCells;
        for (let day = 1; day <= remainingCells; day++) {
            const nextMonth = month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const actualNextMonth = month === 11 ? 0 : nextMonth;
            const dayCell = createDayCell(day, 'other-month');
            
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
        
        if (dateStr) {
            const date = new Date(dateStr);
            const weekdayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            const dayNumber = document.createElement('span');
            dayNumber.textContent = day;
            dayNumber.className = 'day-number';
            
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
        document.querySelectorAll('.day-cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
        
        cellElement.classList.add('selected');
        selectedDate = dateStr;
        
        const date = new Date(dateStr);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        document.getElementById('selected-date-display').textContent = 
            `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        updateTimeline(dateStr);
    }

    function updateTimeline(dateStr) {
        const timelineBar = document.getElementById('timeline-bar');
        timelineBar.innerHTML = '';
        
        const dayMoods = generateMockMoodData();
        
        dayMoods.forEach(mood => {
            const dot = document.createElement('span');
            dot.className = `dot ${mood.mood}`;
            const position = (mood.hour / 24) * 100;
            dot.style.left = `${position}%`;
            timelineBar.appendChild(dot);
        });
    }

    function generateMockMoodData() {
        const moodColors = ['green', 'yellow', 'pink', 'blue'];
        const moods = [];
        const workTimeCount = Math.floor(Math.random() * 6) + 10;
        for (let i = 0; i < workTimeCount; i++) {
            const hour = 8 + Math.random() * 16;
            moods.push({
                hour: hour,
                mood: moodColors[Math.floor(Math.random() * moodColors.length)]
            });
        }
        return moods.sort((a, b) => a.hour - b.hour);
    }

    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    const calendarGrid = document.getElementById('calendar-grid');
    const calendarToggle = document.getElementById('calendar-toggle');
    
    calendarToggle.addEventListener('click', () => {
        calendarGrid.classList.toggle('expanded');
        calendarToggle.classList.toggle('expanded');
    });

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

    // ============ 健康指标四宫格弹窗 (新逻辑) ============
    const healthModal = document.getElementById('health-modal');
    const openHealthBtn = document.getElementById('open-health-modal-btn');
    const closeHealthBtn = document.getElementById('close-health-modal-btn');
    
    let balanceChartNew = null;
    let activityChartNew = null;
    let stressChartNew = null;
    let recoveryChartNew = null;

    // 添加 Tooltip 点击事件监听
    function initTooltips() {
        const buttons = document.querySelectorAll('.info-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止冒泡关闭弹窗
                const targetId = btn.getAttribute('data-target');
                const tooltip = document.getElementById(targetId);
                
                // 关闭其他打开的 tooltip
                document.querySelectorAll('.tooltip-box').forEach(t => {
                    if(t.id !== targetId) t.classList.remove('active');
                });
                
                // 切换当前 tooltip
                if(tooltip) {
                    tooltip.classList.toggle('active');
                }
            });
        });

        // 点击卡片其他区域关闭 Tooltip
        document.addEventListener('click', () => {
             document.querySelectorAll('.tooltip-box').forEach(t => t.classList.remove('active'));
        });
    }

    // 初始化新的仪表盘 (条状风格)
    function initializeNewCharts() {
        const balanceDom = document.getElementById('balance-chart-new');
        const activityDom = document.getElementById('activity-chart-new');
        const stressDom = document.getElementById('stress-chart-new');
        const recoveryDom = document.getElementById('recovery-chart-new');
        
        if (balanceDom) balanceChartNew = echarts.init(balanceDom);
        if (activityDom) activityChartNew = echarts.init(activityDom);
        if (stressDom) stressChartNew = echarts.init(stressDom);
        if (recoveryDom) recoveryChartNew = echarts.init(recoveryDom);

        // 通用的仪表盘配置生成器
        const createGaugeOption = (ranges) => ({
            series: [{
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                min: 0,
                max: 100,
                splitNumber: 10, // 分割成10个小条
                radius: '110%',
                center: ['50%', '85%'], // 半圆底部对齐
                itemStyle: {
                    color: '#FFAB91', // 默认颜色
                },
                progress: {
                    show: false
                },
                pointer: { 
                    show: true,
                    length: '60%',
                    width: 4,
                    itemStyle: { color: '#5C5C66' }
                },
                axisLine: {
                    lineStyle: { 
                        width: 12, 
                        color: ranges 
                    } 
                },
                axisTick: { show: false },
                splitLine: {
                    length: 15,
                    lineStyle: { width: 3, color: '#fff' } // 白色分割线创造"条状"效果
                },
                axisLabel: { show: false },
                title: { show: false },
                detail: { show: false },
                data: [{ value: 0 }]
            }]
        });

        // Stress: 0-25% (Red), 25-50% (Yellow), 50-100% (Green)
        if(stressChartNew) stressChartNew.setOption(createGaugeOption([[0.25, '#FF6B6B'], [0.5, '#FFD93D'], [1, '#6BCB77']]));
        
        // Recovery: 0-33% (Red), 33-66% (Yellow), 66-100% (Green)
        if(recoveryChartNew) recoveryChartNew.setOption(createGaugeOption([[0.33, '#FF6B6B'], [0.66, '#FFD93D'], [1, '#6BCB77']]));

        // Balance: 0-10% (Blue), 10-40% (Green), 40-100% (Red)
        if(balanceChartNew) balanceChartNew.setOption(createGaugeOption([[0.1, '#4D96FF'], [0.4, '#6BCB77'], [1, '#FF6B6B']]));
        
        // Activity: 0-33% (Blue), 33-66% (Green), 66-100% (Red)
        if(activityChartNew) activityChartNew.setOption(createGaugeOption([[0.33, '#4D96FF'], [0.66, '#6BCB77'], [1, '#FF6B6B']]));
    }

    openHealthBtn.addEventListener('click', () => {
        healthModal.style.display = 'flex';
        mainContent.style.filter = 'blur(5px)';
        
        // 确保图表已初始化
        if (!balanceChartNew) {
            initializeNewCharts();
            initTooltips(); // 初始化提示框逻辑
        }
        // 重新调整大小以适应
        setTimeout(() => {
            if(balanceChartNew) balanceChartNew.resize();
            if(activityChartNew) activityChartNew.resize();
        }, 100);
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
        
        ctx.clearRect(0, 0, size, size);
        
        const emotionPoints = [];
        const numPoints = 20 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (Math.PI * 2 * i) / numPoints + Math.random() * 0.3;
            const radius = maxRadius * (0.3 + Math.random() * 0.7);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            const colors = [
                { r: 255, g: 215, b: 0, a: 0.6 },    
                { r: 255, g: 107, b: 107, a: 0.6 },  
                { r: 135, g: 206, b: 235, a: 0.6 },  
                { r: 144, g: 238, b: 144, a: 0.6 },  
                { r: 192, g: 192, b: 192, a: 0.4 }   
            ];
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            emotionPoints.push({ x, y, color, size: 60 + Math.random() * 100 });
        }
        
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
        
        ctx.filter = 'blur(30px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2);
        ctx.stroke();
    }

    function initializeModalCharts() {
        const hrChartDom = document.getElementById('modal-hr-chart');
        const brChartDom = document.getElementById('modal-br-chart');
        modalHrChart = echarts.init(hrChartDom);
        modalBrChart = echarts.init(brChartDom);
        const hrOption = {
            title: { text: '心率监测', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 30, top: 50, bottom: 30, containLabel: true },
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                axisLabel: { show: false },
                axisTick: { show: false }
            },
            yAxis: { 
                type: 'value', 
                name: 'BPM', 
                nameLocation: 'middle',
                nameGap: 40,
                splitNumber: 4,
                axisLabel: { formatter: (v) => Math.round(Number(v)) } 
            },
            series: [{ type: 'line', showSymbol: false, smooth: true, lineStyle: { width: 2, color: '#f5576c' }, areaStyle: { opacity: 0.15, color: '#f5576c' }, data: [] }]
        };
        const brOption = {
            title: { text: '呼吸率监测', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 30, top: 50, bottom: 30, containLabel: true },
            xAxis: { 
                type: 'category', 
                boundaryGap: false, 
                axisLabel: { show: false },
                axisTick: { show: false }
            },
            yAxis: { 
                type: 'value', 
                name: 'RPM', 
                nameLocation: 'middle',
                nameGap: 40,
                splitNumber: 4,
                axisLabel: { formatter: (v) => Math.round(Number(v)) } 
            },
            series: [{ type: 'line', showSymbol: false, smooth: true, lineStyle: { width: 2, color: '#00f2fe' }, areaStyle: { opacity: 0.15, color: '#00f2fe' }, data: [] }]
        };
        modalHrChart.setOption(hrOption);
        modalBrChart.setOption(brOption);
        window.modalCharts = { hr: modalHrChart, br: modalBrChart };
    }

    // ============ 数据更新逻辑 ============
    
    function safeArray(a) { 
        return Array.isArray(a) ? a : []; 
    }

    function updateModalCharts(state) {
        const t = safeArray(state.time);
        const hr = safeArray(state.hr);
        const br = safeArray(state.br);
        
        const maxPoints = 30;
        const startIdx = Math.max(0, t.length - maxPoints);
        
        const tSliced = t.slice(startIdx);
        const hrSliced = hr.slice(startIdx);
        const brSliced = br.slice(startIdx);
        
        const tStr = tSliced.map((time, idx) => String(idx));
        
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
        // 1. 更新压力水平 (SDNN)
        // 逻辑: SDNN 越高(好)，压力越低。
        // 范围: 0-200ms. 映射到 0-100%
        const sdnn = safeArray(state.sdnn);
        if (sdnn.length > 0) {
            let sdnnValue = Math.round(sdnn[sdnn.length - 1]);
            if (sdnnValue > 200) sdnnValue = 200; 
            
            document.getElementById('stress-level-value').textContent = sdnnValue;
            
            // 映射: 0-200 -> 0-100
            let percentage = (sdnnValue / 200) * 100;
            percentage = Math.max(0, Math.min(100, percentage)); 
            
            if (stressChartNew) {
                stressChartNew.setOption({
                    series: [{ data: [{ value: percentage }] }]
                });
            }
        }

        // 2. 更新恢复能力 (Valence)
        // 范围: -3 到 3. 映射到 0-100%
        if (state.valence_score !== null && state.valence_score !== undefined) {
             const valNorm = (state.valence_score + 3)/6;
             let valencePercent = Math.round(valNorm * 100);
             valencePercent = Math.max(0, Math.min(100, valencePercent));

            document.getElementById('recovery-value').textContent = Math.round(state.valence_score * 10) / 10;
            
            if (recoveryChartNew) {
                recoveryChartNew.setOption({
                    series: [{ data: [{ value: valencePercent }] }]
                });
            }
        } else {
            document.getElementById('recovery-value').textContent = '--';
        }

        // 3. 更新自主神经平衡 (LF/HF Ratio)
        const ratio = safeArray(state.lf_hf);
        if (ratio.length > 0) {
            const ratioValue = Number(ratio[ratio.length - 1]).toFixed(1);
            document.getElementById('balance-value').textContent = ratioValue;
            
            // 仪表盘映射: 假设 0-5 范围
            const chartVal = (ratioValue / 5) * 100;
            
            if (balanceChartNew) {
                balanceChartNew.setOption({
                    series: [{ data: [{ value: Math.min(chartVal, 100) }] }]
                });
            }
        }

        // 4. 更新自主神经活性 (Arousal)
        if (state.arousal_score !== null && state.arousal_score !== undefined) {
            // 假设 arousal_score 也是 -3 到 3
            const arousalNorm = (state.arousal_score + 3)/6;
            const arousalPercent = Math.round(arousalNorm * 100);
            
            document.getElementById('activity-value').textContent = Math.round(state.arousal_score * 10) / 10;
            
            if (activityChartNew) {
                activityChartNew.setOption({
                    series: [{ data: [{ value: arousalPercent }] }]
                });
            }
        } else {
            document.getElementById('activity-value').textContent = '--';
        }
    }

    function updateMoodStatus(state) {
        if (state.emotion_state && state.emotion_state !== null) {
            const emotionState = state.emotion_state;
            const t = translations[currentLang];
            
            const moodText = t.emotions[emotionState] || emotionState;
            document.querySelector('.mood-text h2').textContent = moodText;
            
            const promptText = t.prompts[emotionState] || t.moodPrompt;
            document.querySelector('.mood-prompt').textContent = promptText;
            
            const moodVisual = document.querySelector('.mood-visual');
            moodVisual.classList.remove('mood-joy', 'mood-tense', 'mood-low', 'mood-calm', 'mood-neutral');
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

    fetchState();
    setInterval(fetchState, 1000);

    window.addEventListener('resize', () => {
        if (modalHrChart) modalHrChart.resize();
        if (modalBrChart) modalBrChart.resize();
        if (balanceChartNew) balanceChartNew.resize();
        if (activityChartNew) activityChartNew.resize();
    });

    document.getElementById('lang-toggle-btn').addEventListener('click', () => {
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        switchLanguage(newLang);
    });

    switchLanguage(currentLang);

});