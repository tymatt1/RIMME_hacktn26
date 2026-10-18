export const bridgePaths = [
  'M4 24V13M32 24V13M4 18C11 18 10 8 18 8S25 18 32 18M4 24H32M10 24V16M18 24V9M26 24V16',
  'M3 29H33',
]

export const bridgeMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">${bridgePaths.map((path) => `<path d="${path}" stroke="#174d43" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`
