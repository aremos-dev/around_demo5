#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later
 
import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
 
import array
try:
  from gi.repository import GObject,GLib
except ImportError:
  import gobject as GObject
import sys
import os
import time
import subprocess
 
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
 
 
class Application(dbus.service.Object):
    """
    org.bluez.GattApplication1 interface implementation
    """
    def __init__(self, bus):
        self.path = '/'
        self.services = []
        dbus.service.Object.__init__(self, bus, self.path)
        self.add_service(WifiService(bus, 0))
        # 保留原有的其他服务
 
    def get_path(self):
        return dbus.ObjectPath(self.path)
 
    def add_service(self, service):
        self.services.append(service)
 
    @dbus.service.method(DBUS_OM_IFACE, out_signature='a{oa{sa{sv}}}')
    def GetManagedObjects(self):
        response = {}
        print('GetManagedObjects')
 
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
    """
    org.bluez.GattService1 interface implementation
    """
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
                                self.get_characteristic_paths(),
                                signature='o')
                }
        }
 
    def get_path(self):
        return dbus.ObjectPath(self.path)
 
    def add_characteristic(self, characteristic):
        self.characteristics.append(characteristic)
 
    def get_characteristic_paths(self):
        result = []
        for chrc in self.characteristics:
            result.append(chrc.get_path())
        return result
 
    def get_characteristics(self):
        return self.characteristics
 
    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_SERVICE_IFACE:
            raise InvalidArgsException()
 
        return self.get_properties()[GATT_SERVICE_IFACE]
 
 
class Characteristic(dbus.service.Object):
    """
    org.bluez.GattCharacteristic1 interface implementation
    """
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
                                self.get_descriptor_paths(),
                                signature='o')
                }
        }
 
    def get_path(self):
        return dbus.ObjectPath(self.path)
 
    def add_descriptor(self, descriptor):
        self.descriptors.append(descriptor)
 
    def get_descriptor_paths(self):
        result = []
        for desc in self.descriptors:
            result.append(desc.get_path())
        return result
 
    def get_descriptors(self):
        return self.descriptors
 
    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_CHRC_IFACE:
            raise InvalidArgsException()
 
        return self.get_properties()[GATT_CHRC_IFACE]
 
    @dbus.service.method(GATT_CHRC_IFACE,
                        in_signature='a{sv}',
                        out_signature='ay')
    def ReadValue(self, options):
        print('Default ReadValue called, returning error')
        raise NotSupportedException()
 
    @dbus.service.method(GATT_CHRC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options):
        print('Default WriteValue called, returning error')
        raise NotSupportedException()
 
    @dbus.service.method(GATT_CHRC_IFACE)
    def StartNotify(self):
        print('Default StartNotify called, returning error')
        raise NotSupportedException()
 
    @dbus.service.method(GATT_CHRC_IFACE)
    def StopNotify(self):
        print('Default StopNotify called, returning error')
        raise NotSupportedException()
 
    @dbus.service.signal(DBUS_PROP_IFACE,
                         signature='sa{sv}as')
    def PropertiesChanged(self, interface, changed, invalidated):
        pass
 
 
class Descriptor(dbus.service.Object):
    """
    org.bluez.GattDescriptor1 interface implementation
    """
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
 
    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != GATT_DESC_IFACE:
            raise InvalidArgsException()
 
        return self.get_properties()[GATT_DESC_IFACE]
 
    @dbus.service.method(GATT_DESC_IFACE,
                        in_signature='a{sv}',
                        out_signature='ay')
    def ReadValue(self, options):
        print ('Default ReadValue called, returning error')
        raise NotSupportedException()
 
    @dbus.service.method(GATT_DESC_IFACE, in_signature='aya{sv}')
    def WriteValue(self, value, options):
        print('Default WriteValue called, returning error')
        raise NotSupportedException()
 
 
########################################
# WiFi Provisioning Service and Chars  #
########################################

# In-memory buffer for received WiFi credentials
wifi_config_buffer = {
    'ssid_bytes': bytearray(),
    'password_bytes': bytearray(),
    'ssid': '',
    'password': ''
}

class WifiService(Service):
    """
    Custom WiFi provisioning service.
    """
    WIFI_SVC_UUID = '12345678-1234-5678-1234-56789abcde00'

    def __init__(self, bus, index):
        Service.__init__(self, bus, index, self.WIFI_SVC_UUID, True)
        # Internal buffers
        self.ssid_bytes = bytearray()
        self.password_bytes = bytearray()
        self.ssid = ''
        self.password = ''

        # 保存 Log Characteristic 的引用，以便 Service 内部调用发送日志
        self.log_char = WifiLogCharacteristic(bus, 2, self)
        
        self.add_characteristic(WifiSsidCharacteristic(bus, 0, self))
        self.add_characteristic(WifiPasswordCharacteristic(bus, 1, self))
        self.add_characteristic(self.log_char)

    def send_log(self, message):
        """
        辅助函数：通过 notify 发送日志给手机客户端。
        """
        print(f"[System Log] {message}") # 在本地终端打印
        if self.log_char:
            self.log_char.update_log(message)


class WifiLogCharacteristic(Characteristic):
    """
    新增 Characteristic：用于向客户端展示程序输出或报错。
    支持 Read (读取最后一条) 和 Notify (实时订阅)。
    UUID: ...e03
    """
    LOG_CHRC_UUID = '12345678-1234-5678-1234-56789abcde03'

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            self.LOG_CHRC_UUID,
            ['read', 'notify'],
            service)
        self.notifying = False
        self.current_log = "Ready"

    def update_log(self, message):
        self.current_log = message
        # 将字符串转为 dbus.Byte 数组
        value = [dbus.Byte(c) for c in message.encode('utf-8')]
        
        # 如果客户端订阅了 notify，则推送更新
        if self.notifying:
            print(f"Notifying client: {message}")
            self.PropertiesChanged(GATT_CHRC_IFACE, {'Value': value}, [])

    def ReadValue(self, options):
        # 允许客户端主动读取最后一条日志
        return [dbus.Byte(c) for c in self.current_log.encode('utf-8')]

    def StartNotify(self):
        if self.notifying:
            return
        self.notifying = True
        print('Log notifications enabled')

    def StopNotify(self):
        if not self.notifying:
            return
        self.notifying = False
        print('Log notifications disabled')


class WifiSsidCharacteristic(Characteristic):
    """
    SSID 写入特征值。
    强制校验 UTF-8，失败则通过 Log 特征值报错。
    UUID: ...e01
    """
    SSID_CHRC_UUID = '12345678-1234-5678-1234-56789abcde01'

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            self.SSID_CHRC_UUID,
            ['write'],
            service)

    def WriteValue(self, value, options):
        # value 是 dbus.Byte 的数组
        raw = bytes(list(value))
        
        try:
            # 严格 UTF-8 校验，不使用 errors='ignore'
            decoded = raw.decode('utf-8')
        except UnicodeError:
            err_msg = "Error: SSID must be UTF-8 encoded"
            # 1. 发送日志通知手机
            self.service.send_log(err_msg)
            # 2. 拒绝本次写入
            raise FailedException(err_msg)

        # 保存到 Service 内部 buffer
        self.service.ssid_bytes = bytearray(raw)
        self.service.ssid = decoded
        
        # 保存到全局 buffer (如果有外部模块调用)
        wifi_config_buffer['ssid_bytes'] = bytearray(raw)
        wifi_config_buffer['ssid'] = decoded

        msg = f"SSID set to: {decoded}"
        self.service.send_log(msg)


class WifiPasswordCharacteristic(Characteristic):
    """
    密码写入特征值。
    强制校验 UTF-8，失败则通过 Log 特征值报错。
    UUID: ...e02
    """
    PASS_CHRC_UUID = '12345678-1234-5678-1234-56789abcde02'

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            self.PASS_CHRC_UUID,
            ['write'],
            service)

    def WriteValue(self, value, options):
        raw = bytes(list(value))
        
        try:
            # 严格 UTF-8 校验
            decoded = raw.decode('utf-8')
        except UnicodeError:
            err_msg = "Error: Password must be UTF-8 encoded"
            self.service.send_log(err_msg)
            raise FailedException(err_msg)

        # 保存到 Service 内部 buffer
        self.service.password_bytes = bytearray(raw)
        self.service.password = decoded

        # 保存到全局 buffer
        wifi_config_buffer['password_bytes'] = bytearray(raw)
        wifi_config_buffer['password'] = decoded

        # 记录日志（仅显示长度，不显示明文）
        self.service.send_log(f"Password received (len={len(decoded)})")


########################################
# Other Services (Original)            #
########################################
 

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
            properties['ServiceUUIDs'] = dbus.Array(self.service_uuids,
                                                    signature='s')
        if self.solicit_uuids is not None:
            properties['SolicitUUIDs'] = dbus.Array(self.solicit_uuids,
                                                    signature='s')
        if self.manufacturer_data is not None:
            properties['ManufacturerData'] = dbus.Dictionary(
                self.manufacturer_data, signature='qv')
        if self.service_data is not None:
            properties['ServiceData'] = dbus.Dictionary(self.service_data,
                                                        signature='sv')
        if self.local_name is not None:
            properties['LocalName'] = dbus.String(self.local_name)
        if self.include_tx_power is not None:
            properties['IncludeTxPower'] = dbus.Boolean(self.include_tx_power)

        if self.data is not None:
            properties['Data'] = dbus.Dictionary(
                self.data, signature='yv')
        return {LE_ADVERTISEMENT_IFACE: properties}

    def get_path(self):
        return dbus.ObjectPath(self.path)

    @dbus.service.method(DBUS_PROP_IFACE,
                         in_signature='s',
                         out_signature='a{sv}')
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE:
            raise InvalidArgsException()
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]

    @dbus.service.method(LE_ADVERTISEMENT_IFACE,
                         in_signature='',
                         out_signature='')
    def Release(self):
        print('%s: Released' % self.path)


class TestAdvertisement(Advertisement):

    def __init__(self, bus, index):
        Advertisement.__init__(self, bus, index, 'peripheral')
        # 只广播 WiFi 配置服务的 UUID
        self.add_service_uuid(WifiService.WIFI_SVC_UUID)
        self.local_name = "kickpi"
        self.include_tx_power = False

    def add_service_uuid(self, uuid):
        if not self.service_uuids:
            self.service_uuids = []
        self.service_uuids.append(uuid)

    def add_manufacturer_data(self, manuf_code, data):
        if not self.manufacturer_data:
            self.manufacturer_data = dict()
        self.manufacturer_data[manuf_code] = dbus.Array(data, signature='y')

    def add_service_data(self, uuid, data):
        if not self.service_data:
            self.service_data = dict()
        self.service_data[uuid] = dbus.Array(data, signature='y')
    
    def add_data(self, ad_type, data):
        if not self.data:
            self.data = dict()
        self.data[ad_type] = dbus.Array(data, signature='y')
 
def register_app_cb():
    print('GATT application registered')
 
 
def register_app_error_cb(error):
    print('Failed to register application: ' + str(error))
    mainloop.quit()
 
 
def register_ad_cb():
    print('Advertisement registered')


def register_ad_error_cb(error):
    print('Failed to register advertisement: ' + str(error))
    mainloop.quit()
 
def find_adapter(bus):
    remote_om = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, '/'),
                               DBUS_OM_IFACE)
    objects = remote_om.GetManagedObjects()
 
    for o, props in objects.items():
        if GATT_MANAGER_IFACE in props.keys():
            return o
 
    return None
 
 
def check_dbus_available():
    """检查 D-Bus 是否可用"""
    dbus_paths = ['/var/run/dbus/system_bus_socket', '/run/dbus/system_bus_socket']
    for path in dbus_paths:
        if os.path.exists(path):
            return True
    return False


def main():
    global mainloop

    adapter = None
    print("Searching for Bluetooth Adapter...")
    
    # 先检查 D-Bus 是否可用
    if not check_dbus_available():
        print("错误: D-Bus socket 不可用!")
        print("如果在 Docker 中运行，请确保：")
        print("  1. 主机上 dbus 服务正在运行: sudo systemctl start dbus")
        print("  2. docker-compose.yml 中挂载了 /var/run/dbus")
        return
 
    # Restart bluetooth service
    # 注意：Docker 容器以 root 运行，不需要 sudo
    # 检测是否在容器中（通过检查 /.dockerenv 文件）
    in_docker = os.path.exists('/.dockerenv')
    
    try:
        if in_docker:
            # Docker 环境：直接运行命令（容器以 root 运行）
            os.system('rfkill unblock bluetooth 2>/dev/null')
            os.system('bluetoothctl power off 2>/dev/null')
            time.sleep(1)  # 给硬件一点反应时间
            os.system('bluetoothctl power on 2>/dev/null')
        else:
            # 非 Docker 环境：使用 sudo
            os.system('sudo rfkill unblock bluetooth')
            os.system('sudo bluetoothctl power off')
            time.sleep(1)  # 给硬件一点反应时间
            os.system('sudo bluetoothctl power on')
    except Exception as e:
        print(f"蓝牙初始化警告: {e}")

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    
    try:
        bus = dbus.SystemBus()
    except dbus.exceptions.DBusException as e:
        print(f"无法连接到 D-Bus: {e}")
        print("请确保 D-Bus 服务正在运行")
        return
 
    adapter = find_adapter(bus)
    if not adapter:
        print('GattManager1 interface not found')
        return
 
    service_manager = dbus.Interface(
            bus.get_object(BLUEZ_SERVICE_NAME, adapter),
            GATT_MANAGER_IFACE)
    
    ad_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter),
                                LE_ADVERTISING_MANAGER_IFACE)
 
    app = Application(bus)
 
    mainloop = GLib.MainLoop()
 
    print('Registering GATT application...')
 
    service_manager.RegisterApplication(app.get_path(), {},
                                    reply_handler=register_app_cb,
                                    error_handler=register_app_error_cb)

    adv = TestAdvertisement(bus, 0)
    print('Registering advertisement...')
    ad_manager.RegisterAdvertisement(adv.get_path(), {},
                                     reply_handler=register_ad_cb,
                                     error_handler=register_ad_error_cb)
 
    try:
        mainloop.run()
    except KeyboardInterrupt:
        ad_manager.UnregisterAdvertisement(adv.get_path())
        print("Advertisement unregistered")
        dbus.service.Object.remove_from_connection(adv)

if __name__ == '__main__':
    main()