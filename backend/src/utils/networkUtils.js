import os from 'os';

/**
 * Converts an IPv4 dotted-decimal string to an unsigned 32-bit integer.
 * Example: '192.168.1.1' -> 3232235777
 * @param {string} ipString 
 * @returns {number}
 */
export function ipToInt(ipString) {
  if (!ipString || typeof ipString !== 'string') return 0;
  // Handle IPv4-mapped IPv6 addresses like '::ffff:192.168.1.1'
  const cleaned = ipString.replace(/^::ffff:/, '').trim();
  const octets = cleaned.split('.').map(Number);
  if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) {
    return 0;
  }
  return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
}

/**
 * Converts an unsigned 32-bit integer to an IPv4 dotted-decimal string.
 * Example: 3232235777 -> '192.168.1.1'
 * @param {number} intVal 
 * @returns {string}
 */
export function intToIp(intVal) {
  return [
    (intVal >>> 24) & 255,
    (intVal >>> 16) & 255,
    (intVal >>> 8) & 255,
    intVal & 255,
  ].join('.');
}

/**
 * Calculates the CIDR prefix length from a subnet mask string.
 * Example: '255.255.255.0' -> 24
 * @param {string} netmaskString 
 * @returns {number}
 */
export function netmaskToPrefixLength(netmaskString) {
  const maskInt = ipToInt(netmaskString);
  let count = 0;
  for (let i = 31; i >= 0; i--) {
    if ((maskInt & (1 << i)) !== 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Computes the canonical Network ID (Subnet Network Address) using bitwise AND:
 * Network_Address = IP & Subnet_Mask
 * Example: ('10.50.100.190', '255.255.255.0') -> { networkAddress: '10.50.100.0', prefixLength: 24, cidr: '10.50.100.0/24' }
 * @param {string} ipString 
 * @param {string} netmaskString 
 * @returns {{ networkAddress: string, prefixLength: number, cidr: string }}
 */
export function calculateNetworkId(ipString, netmaskString = '255.255.255.0') {
  const ip = ipToInt(ipString);
  const mask = ipToInt(netmaskString);
  const networkInt = (ip & mask) >>> 0;
  const networkAddress = intToIp(networkInt);
  const prefixLength = netmaskToPrefixLength(netmaskString);
  return {
    networkAddress,
    prefixLength,
    cidr: `${networkAddress}/${prefixLength}`,
  };
}

/**
 * Validates if two IP addresses belong to the exact same subnet mask.
 * Defends against Rogue Access Points and Hotspot renaming spoofing.
 * @param {string} ip1 
 * @param {string} ip2 
 * @param {string} netmask 
 * @returns {boolean}
 */
export function isSameSubnet(ip1, ip2, netmask = '255.255.255.0') {
  if (!ip1 || !ip2) return false;
  const net1 = calculateNetworkId(ip1, netmask).networkAddress;
  const net2 = calculateNetworkId(ip2, netmask).networkAddress;
  return net1 === net2;
}

/**
 * Inspects host network interfaces to retrieve the primary active IPv4 interface,
 * its IP address, subnet mask, and canonical Network ID (CIDR).
 * @returns {{ interfaceName: string, ip: string, netmask: string, networkId: string, mac: string } | null}
 */
export function getActiveInterfaceDetails() {
  const interfaces = os.networkInterfaces();
  
  // Look for non-internal IPv4 interface (e.g. en0, wlan0, eth0)
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const netIdInfo = calculateNetworkId(addr.address, addr.netmask);
        return {
          interfaceName: name,
          ip: addr.address,
          netmask: addr.netmask,
          networkId: netIdInfo.cidr,
          mac: addr.mac,
        };
      }
    }
  }

  // Local loopback fallback for dev/sandbox environments
  return {
    interfaceName: 'lo0',
    ip: '127.0.0.1',
    netmask: '255.0.0.0',
    networkId: '127.0.0.0/8',
    mac: '00:00:00:00:00:00',
  };
}
