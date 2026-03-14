const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get("/judges", async (req,res)=>{

  try{

    const judges = await User.find({ role: "judge" });

    res.json(judges);

  }catch(error){

    res.status(500).json({error:error.message});

  }

});

module.exports = router;