import serial
import time
VOLTAGE_SOC_TABLE = [
    (4.20, 100.0),
    (4.15, 95.0),
    (4.11, 90.0),
    (4.08, 85.0),
    (4.02, 80.0),
    (3.98, 75.0),
    (3.95, 70.0),
    (3.91, 65.0),
    (3.87, 60.0),
    (3.85, 55.0),
    (3.84, 50.0),
    (3.82, 45.0),
    (3.80, 40.0),
    (3.79, 35.0),
    (3.77, 30.0),
    (3.75, 25.0),
    (3.73, 20.0),
    (3.71, 15.0),
    (3.69, 10.0),
    (3.61, 5.0),
    (3.27, 0.0),
]

class BluetoothController():
    def __init__(self, serial):
        self.serial = serial
        if self.serial.is_open:
            print("bluetooth opened successfully.")

    def color(self,r, g ,b):
        self.serial.write(f'c={r},{g},{b}'.encode('ascii'))

    def bright(self, bright):
        #bright 0~255
        self.serial.write(f'b={bright}'.encode('ascii'))

    def mode(self, mode):
        #mode = 0,1,2
        self.serial.write(f'm={mode}'.encode('ascii'))

    def shake(self,v = 1):
        self.serial.write(f'v={v}'.encode('ascii'))

    def spike_shake(self, vm = 1):
        #vm = 1 start vm = -1 stop
        if vm == 1:
            self.serial.write(f'vm=1'.encode('ascii'))
        elif vm == -1:
            self.serial.write(f'vm=-1'.encode('ascii'))
    def ppg(self, p=0):
        if p == 1:
            self.serial.write(f'p=1'.encode('ascii'))   
        if p == 0:
            self.serial.write(f'p=0'.encode('ascii'))

    def calculate_percentage_lookup(self, voltage):

        # 处理边界情况
        if voltage >= VOLTAGE_SOC_TABLE[0][0]:
            return 100.0
        if voltage <= VOLTAGE_SOC_TABLE[-1][0]:
            return 0.0

        # 查找电压所在的区间
        for i in range(len(VOLTAGE_SOC_TABLE) - 1):
            v_high, soc_high = VOLTAGE_SOC_TABLE[i]
            v_low, soc_low = VOLTAGE_SOC_TABLE[i+1]
            
            if v_low <= voltage <= v_high:
                # 在找到的区间内进行线性插值
                # 公式: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
                percentage = soc_low + (voltage - v_low) * (soc_high - soc_low) / (v_high - v_low)
                return percentage

    def battery(self):
        self.serial.write(f'E=1\n'.encode('ascii'))
        time.sleep(1)  
        # print(self.serial.readline())
        
        # 读取串口返回的数据
        if self.serial.in_waiting > 0:
            response = self.serial.readline().decode('ascii').strip()
            print(f"收到响应: {response}")

            # 移除 'V' 后缀并转换为浮点数
            voltage_str = response.replace('V', '').strip()
            voltage = float(voltage_str)
            percentage = self.calculate_percentage_lookup(voltage)
            print(f'battery capacity:{percentage}')
            return percentage

    def stop(self):
        time.sleep(1)
        bt.ppg(0)
        time.sleep(2)
        bt.mode(3)
        time.sleep(1)
        bt.spike_shake(-1)

if __name__ == "__main__":

    ser = serial.Serial(port='/dev/bt', baudrate=115200, timeout=1)
    if ser.is_open:
        # print("Serial port opened successfully.")
        bt = BluetoothController(ser)
        time.sleep(1)
        # bt.ppg(1)
        # time.sleep(1)
        # bt.battery()
        # time.sleep(1)
        bt.mode(3)
        time.sleep(2)
        # bt.spike_shake(1)
        # time.sleep(5)
        # bt.spike_shake(-1)
        # time.sleep(2)
        bt.stop()

