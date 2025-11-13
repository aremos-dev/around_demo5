#!/usr/bin/env python3
# SPDX-License-Identifier: LGPL-2.1-or-later
 
import dbus
import dbus.exceptions
import dbus.mainloop.glib
import dbus.service
 
import array
try:
  from gi.repository import GObject
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
    Custom WiFi provisioning service. Clients can write SSID and Password
    which are stored in an in-memory buffer for later use.
    """
    WIFI_SVC_UUID = '12345678-1234-5678-1234-56789abcde00'

    def __init__(self, bus, index):
        Service.__init__(self, bus, index, self.WIFI_SVC_UUID, True)
        # Internal buffers (mirror of module-level wifi_config_buffer)
        self.ssid_bytes = bytearray()
        self.password_bytes = bytearray()
        self.ssid = ''
        self.password = ''

        self.add_characteristic(WifiSsidCharacteristic(bus, 0, self))
        self.add_characteristic(WifiPasswordCharacteristic(bus, 1, self))


class WifiSsidCharacteristic(Characteristic):
    """
    Characteristic for writing WiFi SSID.
    """
    SSID_CHRC_UUID = '12345678-1234-5678-1234-56789abcde01'

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            self.SSID_CHRC_UUID,
            ['write'],
            service)

    def WriteValue(self, value, options):
        # value: array of bytes (dbus.Byte)
        raw = bytes(list(value))
        try:
            decoded = raw.decode('utf-8', errors='ignore')
        except Exception:
            decoded = ''

        # Store in service buffers
        self.service.ssid_bytes = bytearray(raw)
        self.service.ssid = decoded

        # Store in module-level buffer for easy access from elsewhere
        wifi_config_buffer['ssid_bytes'] = bytearray(raw)
        wifi_config_buffer['ssid'] = decoded

        print('WiFi SSID received (len=%d)' % len(raw))


class WifiPasswordCharacteristic(Characteristic):
    """
    Characteristic for writing WiFi Password.
    """
    PASS_CHRC_UUID = '12345678-1234-5678-1234-56789abcde02'

    def __init__(self, bus, index, service):
        Characteristic.__init__(
            self, bus, index,
            self.PASS_CHRC_UUID,
            ['write'],
            service)

    def WriteValue(self, value, options):
        # value: array of bytes (dbus.Byte)
        raw = bytes(list(value))
        try:
            decoded = raw.decode('utf-8', errors='ignore')
        except Exception:
            decoded = ''

        # Store in service buffers
        self.service.password_bytes = bytearray(raw)
        self.service.password = decoded

        # Store in module-level buffer for easy access from elsewhere
        wifi_config_buffer['password_bytes'] = bytearray(raw)
        wifi_config_buffer['password'] = decoded

        # Avoid printing the actual password; only print length
        print('WiFi Password received (len=%d)' % len(raw))

        # Attempt to connect to WiFi
        ssid = wifi_config_buffer.get('ssid')
        password = wifi_config_buffer.get('password')

        if ssid and password:
            print(f"Attempting to connect to SSID: {ssid}")
            try:
                # First, try to delete any existing connection with the same SSID
                # This avoids conflicts with stored credentials
                try:
                    delete_cmd = ["nmcli", "connection", "delete", "id", ssid]
                    subprocess.run(delete_cmd, capture_output=True, text=True)
                    print(f"Deleted existing connection for {ssid}")
                except subprocess.CalledProcessError:
                    # Connection doesn't exist, that's fine
                    print(f"No existing connection found for {ssid}")

                # Now connect to WiFi with new credentials
                command = ["nmcli", "dev", "wifi", "connect", ssid, "password", password]
                result = subprocess.run(command, check=True, capture_output=True, text=True)
                print("Successfully connected to WiFi.")
                print("stdout:", result.stdout)
            except FileNotFoundError:
                print("Error: 'nmcli' command not found. Please ensure NetworkManager is installed.")
            except subprocess.CalledProcessError as e:
                print(f"Failed to connect to WiFi. Error: {e}")
                print("stderr:", e.stderr)
                print("stdout:", e.stdout)
            except Exception as e:
                print(f"An unexpected error occurred: {e}")
        else:
            print("SSID or password missing, cannot connect.")

 
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
        # Keep advertisement minimal to avoid 31-byte overflow and invalid fields
        # Only advertise the custom WiFi provisioning service UUID and a short local name
        self.add_service_uuid(WifiService.WIFI_SVC_UUID)
        self.local_name = "kickpi"
        # Optional: TX Power adds bytes; keep it disabled for minimal size
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
 
 
def main():
    global mainloop
 
    # Restart bluetooth service (simple one-liner as requested)
    os.system('sudo systemctl restart bluetooth')

    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
 
    bus = dbus.SystemBus()
 
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
 
    mainloop = GObject.MainLoop()
 
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