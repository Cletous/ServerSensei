from app.models.user import User
from app.models.device import Device
from app.models.power_status import PowerStatus
from app.models.sensor_reading import SensorReading
from app.models.device_status import DeviceStatus
from app.models.command import Command
from app.models.alert import Alert
from app.models.device_setting import DeviceSetting
from app.models.push_token import PushToken

# This makes sure SQLAlchemy can discover the models when creating tables.