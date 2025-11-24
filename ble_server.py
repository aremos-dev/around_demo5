#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later

import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
import array
import sys
import os
import subprocess
import threading
import time

# [修改 1] 引入 GLib 以修复 PyGIDeprecationWarning
try:
    from gi.repository import GObject, GLib
except ImportError:
    import gobject as GObject
    import glib as GLib

from random import randint

mainloop = None

BLUEZ_SERVICE_NAME = 'org.bluez'
GATT_MANAGER_IFACE = 'org.bluez.GattManager1'
DBUS_OM_IFACE =      'org.freedesktop.DBus.ObjectManager'
DBUS_PROP_IFACE =    'org.freedesktop.DBus.Properties'

GATT_SERVICE_IFACE = 'org.bluez.GattService1'
GATT_CHRC_IFACE =    'org.bluez.GattCharacteristic1'
GATT_DESC_IFACE =    'org.bluez.GattDescriptor1'

LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'
LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1'

# =========================================
# 异常类定义 (保持不变)
# =========================================
class InvalidArgsException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.freedesktop.DBus.Error.InvalidArgs'
class NotSupportedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.NotSupported'
class NotPermittedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.NotPermitted'
class InvalidValueLengthException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.InvalidValueLength'
class FailedException(dbus.exceptions.DBusException):
    _dbus_error_name = 'org.bluez.Error.Failed'

# =========================================
# DBus 基础类 (Application, Service 等)
# =========================================
class Application(dbus.service.Object):
    def __init__(self, bus):
        self.path = '/'
        self.services = []
        dbus.service.Object.__init__(self, bus, self.path)
        self.add_service(WifiService(bus, 0))
    def get_path(self):
        return dbus.ObjectPath(self.path)
    def add_service(self, service):
        self.services.append(service)
    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            chrcs = service.get_characteristics()
            for chrc in chrcs:
                response[chrc.get_path()] = chrc.get_properties()
                descs = chrc.get_descriptors()
                for desc in descs:
                    response[desc.get_path()] = desc.get_properties()
        return response

class Service(dbus.service.Object):
    PATH_BASE = '/org/bluez/example/service'
    def __init__(self, bus, index, uuid, primary):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.uuid = uuid
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, self.path)
    def get_properties(self):
        return {
                GATT_SERVICE_IFACE: {
                        'UUID': self.uuid,
                        'Primary': self.primary,
                        'Characteristics': dbus.Array(
                                self.get_characteristic_paths(), signature='o')
                }
        }
    def get_path(self):
        return dbus.ObjectPath(self.path)
    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)
    def get_characteristic_paths(self):
        return [chrc.get_path() for chrc in self.characteristics]
    def get_characteristics(self):
        return self.characteristics
    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_SERVICE_IFACE: raise InvalidArgsException()
        return self.get_properties()[GATT_SERVICE_IFACE]

class Characteristic(dbus.service.Object):
    def __init__(self, bus, index, uuid, flags, service):
        self.path = service.path + '/char' + str(index)
        self.bus = bus
        self.uuid = uuid
        self.service = service
        self.flags = flags
        self.descriptors = []
        dbus.service.Object.__init__(self, bus, self.path)
    def get_properties(self):
        return {
                GATT_CHRC_IFACE: {
                        'Service': self.service.get_path(),
                        'UUID': self.uuid,
                        'Flags': self.flags,
                        'Descriptors': dbus.Array(
                                self.get_descriptor_paths(), signature='o')
                }
        }
    def get_path(self):
        return dbus.ObjectPath(self.path)
    def add_descriptor(self, descriptor):
        self.descriptors.append(descriptor)
    def get_descriptor_paths(self):
        return [desc.get_path() for desc in self.descriptors]
    def get_descriptors(self):
        return self.descriptors
    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_CHRC_IFACE: raise InvalidArgsException()
        return self.get_properties()[GATT_CHRC_IFACE]
    @dbus.service.method(GATT_CHRC_IFACE, in_signature='a{sv}', out_signature='ay')
    def ReadValue(self, options): raise NotSupportedException()
    @dbus.service.method(GATT_CHRC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options): raise NotSupportedException()
    @dbus.service.method(GATT_CHRC_IFACE)
    def StartNotify(self): raise NotSupportedException()
    @dbus.service.method(GATT_CHRC_IFACE)
    def StopNotify(self): raise NotSupportedException()
    @dbus.service.signal(DBUS_PROP_IFACE, signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated): pass

class Descriptor(dbus.service.Object):
    def __init__(self, bus, index, uuid, flags, characteristic):
        self.path = characteristic.path + '/desc' + str(index)
        self.bus = bus
        self.uuid = uuid
        self.flags = flags
        self.chrc = characteristic
        dbus.service.Object.__init__(self, bus, self.path)
    def get_properties(self):
        return {
                GATT_DESC_IFACE: {
                        'Characteristic': self.chrc.get_path(),
                        'UUID': self.uuid,
                        'Flags': self.flags,
                }
        }
    def get_path(self):
        return dbus.ObjectPath(self.path)
    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_DESC_IFACE: raise InvalidArgsException()
        return self.get_properties()[GATT_DESC_IFACE]
    @dbus.service.method(GATT_DESC_IFACE, in_signature='a{sv}', out_signature='ay')
    def ReadValue(self, options): raise NotSupportedException()
    @dbus.service.method(GATT_DESC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options): raise NotSupportedException()

# =========================================
# Wi-Fi 逻辑与服务实现
# =========================================

wifi_config_buffer = {'ssid': '', 'password': ''}

def connect_wifi_task(ssid, password, status_callback):
    print(f"Thread: Handling request for SSID: '{ssid}'")
    
    # [修改 2] 增加网络扫描步骤
    # 有时候系统还没发现这个 Wi-Fi，直接连会报错 "No network with SSID found"
    status_callback(f"Scanning...")
    try:
        subprocess.run(["nmcli", "dev", "wifi", "rescan"], check=False)
        time.sleep(2) # 给网卡一点时间刷新列表
    except:
        pass

    status_callback(f"Connecting to {ssid[:10]}...")

    try:
        # 1. 删除旧连接
        try:
            subprocess.run(["nmcli", "connection", "delete", "id", ssid], 
                           capture_output=True, text=True, timeout=5)
        except:
            pass

        # 2. 连接
        print(f"Thread: Executing connect command for '{ssid}'")
        cmd = ["nmcli", "dev", "wifi", "connect", ssid, "password", password]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=45)

        if result.returncode == 0:
            print("WiFi Connected Successfully.")
            status_callback("Success: Connected")
            # 尝试获取 IP
            try:
                ip_cmd = subprocess.run("hostname -I", shell=True, capture_output=True, text=True)
                ip = ip_cmd.stdout.strip().split(' ')[0]
                time.sleep(1)
                if ip:
                    status_callback(f"IP: {ip}")
            except:
                pass
        else:
            err_msg = result.stderr.strip()
            print(f"Connect failed: {err_msg}")
            if "secrets" in err_msg.lower():
                status_callback("Error: Bad Password")
            elif "No network" in err_msg:
                # 这通常意味着 SSID 名字对不上，或者信号太弱
                status_callback("Error: SSID Not Found")
            else:
                # 截断显示错误
                status_callback(f"Err: {err_msg[:15]}")

    except subprocess.TimeoutExpired:
        print("WiFi Connection Timeout")
        status_callback("Error: Timeout")
    except Exception as e:
        print(f"Exception: {e}")
        status_callback("Error: Sys Fault")

class WifiService(Service):
    WIFI_SVC_UUID = '12345678-1234-5678-1234-56789abcde00'

    def __init__(self, bus, index):
        Service.__init__(self, bus, index, self.WIFI_SVC_UUID, True)
        self.ssid_chrc = WifiSsidCharacteristic(bus, 0, self)
        self.pass_chrc = WifiPasswordCharacteristic(bus, 1, self)
        self.status_chrc = WifiStatusCharacteristic(bus, 2, self)
        self.add_characteristic(self.ssid_chrc)
        self.add_characteristic(self.pass_chrc)
        self.add_characteristic(self.status_chrc)

class WifiSsidCharacteristic(Characteristic):
    SSID_CHRC_UUID = '12345678-1234-5678-1234-56789abcde01'

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.SSID_CHRC_UUID, ['write'], service)

    def WriteValue(self, value, options):
        raw = bytes(list(value))
        # [修改 3] 彻底清洗字符串：去掉 \x00 (Null Byte)
        decoded = raw.decode('utf-8', errors='ignore').replace('\x00', '').strip()
        
        wifi_config_buffer['ssid'] = decoded
        print(f"Received SSID raw len: {len(raw)}, cleaned: '{decoded}'")
        self.service.status_chrc.update_value_thread_safe(f"SSID set: {decoded}")

class WifiPasswordCharacteristic(Characteristic):
    PASS_CHRC_UUID = '12345678-1234-5678-1234-56789abcde02'

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.PASS_CHRC_UUID, ['write'], service)

    def WriteValue(self, value, options):
        raw = bytes(list(value))
        # [修改 3] 彻底清洗字符串
        decoded = raw.decode('utf-8', errors='ignore').replace('\x00', '').strip()
        
        wifi_config_buffer['password'] = decoded
        print(f"Received Pass len: {len(decoded)}")

        ssid = wifi_config_buffer.get('ssid')
        # 密码允许为空（开放网络），所以只判断 ssid
        if ssid:
            t = threading.Thread(target=connect_wifi_task, 
                                 args=(ssid, decoded, self.service.status_chrc.update_value_thread_safe))
            t.daemon = True
            t.start()
        else:
            self.service.status_chrc.update_value_thread_safe("Error: No SSID")

class WifiStatusCharacteristic(Characteristic):
    STATUS_CHRC_UUID = '12345678-1234-5678-1234-56789abcde03'

    def __init__(self, bus, index, service):
        Characteristic.__init__(self, bus, index, self.STATUS_CHRC_UUID, ['read', 'notify'], service)
        self.notifying = False
        self.status_value = []
        self.update_local_value("Idle")

    def update_local_value(self, text):
        # 确保转换为 ascii 兼容的 bytes，防止 notify 报错
        self.status_value = [dbus.Byte(c) for c in text.encode('utf-8')]

    def update_value_thread_safe(self, text):
        def _update_in_mainloop():
            print(f"Updating Status: {text}")
            self.update_local_value(text)
            if self.notifying:
                self.PropertiesChanged(GATT_CHRC_IFACE, {'Value': self.status_value}, [])
            return False
        
        # [修改 1] 使用 GLib 替代 GObject
        GLib.idle_add(_update_in_mainloop)

    def ReadValue(self, options):
        return self.status_value

    def StartNotify(self):
        if self.notifying: return
        self.notifying = True
        print("Notify ON")

    def StopNotify(self):
        if not self.notifying: return
        self.notifying = False
        print("Notify OFF")

# =========================================
# 广播与主程序
# =========================================
class Advertisement(dbus.service.Object):
    PATH_BASE = '/org/bluez/example/advertisement'
    def __init__(self, bus, index, advertising_type):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.ad_type = advertising_type
        self.service_uuids = None
        self.manufacturer_data = None
        self.solicit_uuids = None
        self.service_data = None
        self.local_name = None
        self.include_tx_power = None
        self.data = None
        dbus.service.Object.__init__(self, bus, self.path)
    def get_properties(self):
        properties = dict()
        properties['Type'] = self.ad_type
        if self.service_uuids is not None:
            properties['ServiceUUIDs'] = dbus.Array(self.service_uuids, signature='s')
        if self.solicit_uuids is not None:
            properties['SolicitUUIDs'] = dbus.Array(self.solicit_uuids, signature='s')
        if self.manufacturer_data is not None:
            properties['ManufacturerData'] = dbus.Dictionary(self.manufacturer_data, signature='qv')
        if self.service_data is not None:
            properties['ServiceData'] = dbus.Dictionary(self.service_data, signature='sv')
        if self.local_name is not None:
            properties['LocalName'] = dbus.String(self.local_name)
        if self.include_tx_power is not None:
            properties['IncludeTxPower'] = dbus.Boolean(self.include_tx_power)
        if self.data is not None:
            properties['Data'] = dbus.Dictionary(self.data, signature='yv')
        return {LE_ADVERTISEMENT_IFACE: properties}
    def get_path(self):
        return dbus.ObjectPath(self.path)
    @dbus.service.method(DBUS_PROP_IFACE, in_signature='s', out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE: raise InvalidArgsException()
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]
    @dbus.service.method(LE_ADVERTISEMENT_IFACE, in_signature='', out_signature='')
    def Release(self):
        print('%s: Released' % self.path)

class TestAdvertisement(Advertisement):
    def __init__(self, bus, index):
        Advertisement.__init__(self, bus, index, 'peripheral')
        self.add_service_uuid(WifiService.WIFI_SVC_UUID)
        self.local_name = "kickpi"
        self.include_tx_power = False
    def add_service_uuid(self, uuid):
        if not self.service_uuids: self.service_uuids = []
        self.service_uuids.append(uuid)

def register_app_cb(): print('App registered')
def register_app_error_cb(error): print('App failed: ' + str(error)); mainloop.quit()
def register_ad_cb(): print('Ad registered')
def register_ad_error_cb(error): print('Ad failed: ' + str(error)); mainloop.quit()

def find_adapter(bus):
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'), DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()
    for o, props in objects.items():
        if GATT_MANAGER_IFACE in props.keys(): return o
    return None

def main():
    global mainloop
    # GLib 需要在 MainLoop 之前配置
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()
    adapter = find_adapter(bus)
    if not adapter:
        print('No BLE adapter found')
        return

    service_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter), GATT_MANAGER_IFACE)
    ad_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter), LE_ADVERTISING_MANAGER_IFACE)
    app = Application(bus)
    
    # [修改 1] 使用 GLib.MainLoop
    mainloop = GLib.MainLoop()

    service_manager.RegisterApplication(app.get_path(), {},
                                    reply_handler=register_app_cb,
                                    error_handler=register_app_error_cb)
    adv = TestAdvertisement(bus, 0)
    ad_manager.RegisterAdvertisement(adv.get_path(), {},
                                     reply_handler=register_ad_cb,
                                     error_handler=register_ad_error_cb)
    try:
        mainloop.run()
    except KeyboardInterrupt:
        ad_manager.UnregisterAdvertisement(adv.get_path())
        print("Exit")

if __name__ == '__main__':
    main()