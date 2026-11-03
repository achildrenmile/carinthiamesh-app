// Werte verifiziert gegen examples/companion_radio/MyMesh.cpp (FIRMWARE_VER_CODE 14).
export const BLE = {
  service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  rx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // App -> Gerät (write)
  tx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Gerät -> App (notify)
} as const

export const Cmd = {
  AppStart: 1,
  SendTxtMsg: 2,
  SendChannelTxtMsg: 3,
  GetContacts: 4,
  GetDeviceTime: 5,
  SetDeviceTime: 6,
  SendSelfAdvert: 7,
  SetAdvertName: 8,
  SyncNextMessage: 10,
  SetRadioParams: 11,
  SetTxPower: 12,
  SetAdvertLatLon: 14,
  Reboot: 19,
  GetBattAndStorage: 20,
  DeviceQuery: 22,
  SendLogin: 26,
  SendStatusReq: 27,
  GetChannel: 31,
  SetChannel: 32,
  SendTelemetryReq: 39,
} as const

export const Resp = {
  Ok: 0,
  Err: 1,
  ContactsStart: 2,
  Contact: 3,
  EndOfContacts: 4,
  SelfInfo: 5,
  Sent: 6,
  ContactMsgRecv: 7,
  ChannelMsgRecv: 8,
  CurrTime: 9,
  NoMoreMessages: 10,
  BattAndStorage: 12,
  DeviceInfo: 13,
  ContactMsgRecvV3: 16,
  ChannelMsgRecvV3: 17,
  ChannelInfo: 18,
} as const

export const Push = {
  Advert: 0x80,
  SendConfirmed: 0x82,
  LoginSuccess: 0x85,
  LoginFail: 0x86,
  StatusResponse: 0x87,
  MsgWaiting: 0x83,
  LogRxData: 0x88,
  TelemetryResponse: 0x8b,
} as const

export const PUB_KEY_SIZE = 32
export const MAX_PATH_SIZE = 64

export const TxtType = { Plain: 0, CliData: 1, Signed: 2 } as const
export const AdvType = { None: 0, Chat: 1, Repeater: 2, Room: 3 } as const
