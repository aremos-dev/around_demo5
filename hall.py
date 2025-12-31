import serial
import time
from collections import deque
import threading

class hall():
    def __init__(self, port='/dev/ttyACM0'):
        self.port = port
        self.hall_value = deque(maxlen=100)
        self.ser = None
        self.baudrate = 115200
        self.reading = False
        self.read_thread = None

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=1)
            if not self.ser.is_open:
                self.ser.open()
            print(f"Successfully connected to {self.port}")
        except serial.SerialException as e:
            print(f"Error connecting to port {self.port}: {e}")
            self.ser = None

    def write_string(self, data, newline="\n"):
        payload = data + "\n"
        written = self.ser.write(payload.encode("utf-8"))
        self.ser.flush()
        # print(f"Wrote {written} bytes to {self.port}: {repr(payload)}")



    def read_line(self):
        # Check if the serial connection is active
        if self.ser and self.ser.is_open:
            # Read one complete line from the serial port
            line_bytes = self.ser.readline()
            
            # Check if we received any data
            if line_bytes:
                # print(line_bytes)
                line_str = line_bytes.decode('utf-8').strip()
                
                # Convert the cleaned string to an integer
                if line_str: # Make sure the string is not empty after stripping
                    value = int(line_str)
                    self.hall_value.append(value)
                    # print(f"Read value: {self.hall_value[-1]}")

    def start_continuous_reading(self):
        if not self.ser:
            print("Cannot start reading, serial port is not connected.")
            return
            
        self.reading = True
        def read_loop():
            while self.reading:
                # Correctly call the instance method
                self.read_line()
        
        self.read_thread = threading.Thread(target=read_loop)
        self.read_thread.daemon = True
        self.read_thread.start()
        
    def stop_reading(self):
        self.reading = False
        if self.read_thread:
            self.read_thread.join() # Wait for the thread to finish
        if self.ser and self.ser.is_open:
            self.ser.close()
        print("Stopped reading and closed serial port.")

if __name__ == "__main__":
    hall_sensor = hall('/dev/ttyS7')
    hall_sensor.connect()
    
    # Start reading only if connection was successful
    if hall_sensor.ser:
        hall_sensor.start_continuous_reading()
        hall_sensor.write_string('platform_flag*0')
        
        # Keep the main thread alive to see the output
        # Stop after 10 seconds for this example
        try:
            time.sleep(100)
        except KeyboardInterrupt:
            print("Stopping...")
        finally:
            hall_sensor.stop_reading()