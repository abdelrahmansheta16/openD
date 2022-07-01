import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent"
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdleFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal"
import Button from "./Button";
import { opend } from "../../../declarations/opend"
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {

  const [NFT, setNFT] = useState({
    name: "", content: ""
  })
  const [owner, setOwner] = useState("")
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoaderHidden] = React.useState(true);
  const [blur, setBlur] = React.useState();
  const [sellStatus, setSellStatus] = useState("")
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);
  const id = props.id;
  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({
    host: localHost
  });
  //remove when deployed live
  agent.fetchRootKey();
  let NFTActor;
  let tokenActor;
  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    })
    const name = await NFTActor.getName();
    const nftOwner = await NFTActor.getOwner();
    const content = await NFTActor.getContent();
    const imageContent = new Uint8Array(content);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], {
      type: "image/png",
    }))

    setNFT({
      name: name, content: image
    })
    setOwner(nftOwner.toText());
    if (props.role == "collection") {
      const nftIsListed = await opend.isListed(props.id);

      if (nftIsListed) {
        setOwner("OpenD");
        setBlur({
          filter: "blur(4px)"
        });
        setSellStatus(" Listed")
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    } else if (props.role == "discover") {
      const originalOwner = await opend.getOriginalOwner(props.id);
      console.log(originalOwner);
      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }
      const price = await opend.getListedNftPrice(props.id);
      setPriceLabel(<PriceLabel price={price.toString()} />);
    }
  }
  let price;
  function handleSell() {
    console.log("Sell Clicked");
    setPriceInput(
      <input
        placeholder="Price in DANG"
        type="number"
        className="price-input"
        value={price}
        onChange={(e) => {
          return price = e.target.value;
        }}
      />
    );
    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    setBlur({
      filter: "blur(4px)"
    })
    setLoaderHidden(false);
    const result = await opend.listItem(id, Number(price));
    console.log(result);
    if (result == "Success") {
      const opendID = await opend.getOpendId();
      const transferResult = await NFTActor.transferOwnerShip(opendID);
      console.log(transferResult);
      setLoaderHidden(true);
      setButton();
      setPriceInput();
      setOwner("OpenD");
      setSellStatus(" Listed")
    }


  }

  async function handleBuy() {
    setLoaderHidden(false);
    tokenActor = await Actor.createActor(tokenIdleFactory, {
      agent,
      canisterId: Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
    });
    const sellerId = await opend.getOriginalOwner(props.id);
    console.log(sellerId);
    const itemPrice = await opend.getListedNftPrice(props.id);
    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success") {
      const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log(transferResult);
    }
    setLoaderHidden(true);
    setDisplay(false);
  }

  useEffect(() => {
    loadNFT();
  }, [])
  return (
    <div style={{ display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={NFT.content}
          style={blur}
        />
        <div hidden={loaderHidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {NFT.name}<span className="purple-text"> {sellStatus} </span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
