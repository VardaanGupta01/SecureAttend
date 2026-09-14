import plistlib
import os
import sys

def get_current_wifi():
    try:
        path = os.path.expanduser('~/Library/Preferences/com.apple.networkserviceproxy.plist')
        if os.path.exists(path):
            with open(path, 'rb') as f:
                d = plistlib.load(f)
            if 'NSPServiceStatusManagerInfo' in d:
                sub = plistlib.loads(d['NSPServiceStatusManagerInfo'])
                objs = sub.get('$objects', [])
                if len(objs) > 3 and isinstance(objs[3], dict) and 'PrivacyProxyNetworkName' in objs[3]:
                    uid = int(objs[3]['PrivacyProxyNetworkName'])
                    name = objs[uid]
                    if isinstance(name, str) and name and not name.startswith('$'):
                        return name
    except Exception:
        pass
    return ''

if __name__ == '__main__':
    result = get_current_wifi()
    if result:
        sys.stdout.write(result)
        sys.exit(0)
    sys.exit(1)
