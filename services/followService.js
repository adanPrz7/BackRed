const Follow = require("../models/follow");
const followUserIds = async(identityUserId) =>{
    //Obtener info de seguimiento
    let following = await Follow.find({"user":identityUserId}).select({"_id": 0, "followed" : 1}).then()
    let followers = await Follow.find({"followed":identityUserId}).select({"_id": 0, "user" : 1}).then()

    //Procesar array de identigicadores
    let followingclean = [];

    following.forEach(follow =>{
        followingclean.push(follow.followed);
    });

    let followersclean = [];

    followers.forEach(follow =>{
        followersclean.push(follow.user);
    });

    return {
        following: followingclean,
        followers: followersclean
    }
}

const followThisUser = async(identityUserId, profileUserId) =>{
    //Obtener info de seguimiento
    let following = await Follow.findOne({"user":identityUserId, "followed": profileUserId});
    let follower = await Follow.findOne({"user": profileUserId, "followed":identityUserId});

    return {
        following,
        follower
    }
}

module.exports ={
    followUserIds,
    followThisUser
}