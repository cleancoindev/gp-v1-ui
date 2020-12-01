import React, { useMemo } from 'react'
import styled from 'styled-components'

import { getImageUrl, RequireContextMock, safeTokenName } from 'utils'
import unknownTokenImg from 'assets/img/unknown-token.png'

const Wrapper = styled.img<WrapperProps>`
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 3.6rem;
  object-fit: contain;
  background-color: white;
  padding: 2px;
  opacity: ${(props): number => (props.faded ? 0.4 : 1)};
`
// keep track of 404 token images
// so we don't retry fetching them
const failedTokenImages = new Set<string>()

function _loadFallbackTokenImage(event: React.SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget

  failedTokenImages.add(image.src)

  image.src = unknownTokenImg
}

export interface Props {
  symbol?: string
  name?: string
  address: string
  addressMainnet?: string
  faded?: boolean
}

export interface WrapperProps {
  faded?: boolean
}

const tokensIconsRequire =
  process.env.NODE_ENV === 'test' ? RequireContextMock : require.context('assets/img/tokens', false)

const tokensIconsFilesByAddress: Record<string, string> = tokensIconsRequire.keys().reduce((acc, file) => {
  const address = file.match(/0x\w{40}/)?.[0]
  if (!address) {
    throw new Error(
      "Error initializing 'assets/img/tokens' images. The image doesn't have the expected format: " + file,
    )
  }
  acc[address.toLowerCase()] = file

  return acc
}, {})

type ImageLoadProps = Pick<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'onError'>

const useFailOnceImage = ({ address, addressMainnet, symbol, name }: Omit<Props, 'faded'>): ImageLoadProps => {
  return useMemo(() => {
    let iconFile = tokensIconsFilesByAddress[address.toLowerCase()]
    if (!iconFile && addressMainnet) {
      iconFile = tokensIconsFilesByAddress[addressMainnet.toLowerCase()]
    }

    const iconFileUrl: string | undefined = iconFile
      ? tokensIconsRequire(iconFile).default
      : getImageUrl(addressMainnet || address)

    // if we know the image failed before, use fallback image right away
    const imgSrc = iconFileUrl && !failedTokenImages.has(iconFileUrl) ? iconFileUrl : unknownTokenImg

    // TODO: Simplify safeTokenName signature, it doesn't need the addressMainnet or id!
    // https://github.com/gnosis/dex-react/issues/1442
    const safeName = safeTokenName({ address, symbol, name })

    return { src: imgSrc, alt: safeName, onError: _loadFallbackTokenImage }
  }, [address, addressMainnet, symbol, name])
}

export const TokenImg: React.FC<Props> = (props) => {
  const { faded } = props

  const imageProps = useFailOnceImage(props)

  return <Wrapper {...imageProps} faded={faded} />
}

export const TokenImgWrapper = styled(TokenImg)`
  margin: 0 1rem 0 0;
`

export default TokenImg
