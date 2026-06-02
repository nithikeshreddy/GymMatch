import { registerUser, loginUser } from "../services/authService.js";
import { generateToken } from "../utils/generateToken.js";

export async function register(req, res) {

    try {
    const {email, password} = req.body;

    if(!email || !password) {
        return res.status(400).json({
            error: "Email, Password fields missing"
        });
    }

    const newUser = await registerUser(email, password);

    const token = generateToken(newUser.id);

    res.status(201).json({
        user: newUser,
        token
    });

    }

    catch (error) {
        res.status(400).json({error: error.message});
    }
};

export async function login(req, res) {
    try {
        const {email, password} = req.body;

        if(!email || !password) {
            return res.status(400).json({
                error: "Missing email, password fields"
            });
        }

       const user = await loginUser(email, password);
        const token = generateToken(user.id);

        res.status(200).json({
            user,
            token
        });

    } 

    catch(error){
        res.status(400).json({error: error.message});
    }

};

