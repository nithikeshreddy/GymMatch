import { createUser, findUserByEmail } from "../repositories/authRepository.js";
import bcrypt from "bcryptjs";

async function registerUser(email, password) {
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword);

    const { password_hash: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
}

async function loginUser(email, password) {
    const user = await findUserByEmail(email);

    if (!user) {
        throw new Error("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        throw new Error("Invalid email or password");
    }

    const { password_hash: _, ...userWithoutPassword } = user;

    return userWithoutPassword;
}

export { registerUser, loginUser };