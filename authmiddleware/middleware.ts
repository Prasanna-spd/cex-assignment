import jwt from "jsonwebtoken"
import type { Request,Response,NextFunction } from "express";

export function authmiddleware(req:Request,res:Response,next:NextFunction){
    const token=req.headers.token as string
    const decoded = jwt.verify(token,"mynameisamarakbaranthony")

    const userId=decoded.userId;

    if(userId){
        req.userId=userId
        next();
    }else{
        return res.status(403).json({
            message:"Token is incorrect"
        })   
    }
}

