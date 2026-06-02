import { useState } from "react";
import api from "../api/axios.js";
import { useNavigate } from "react-router-dom";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    function handleChange(e) {
        if(e.target.name === "email") {
            setEmail(e.target.value);
        }
        if(e.target.name === "password") {
            setPassword(e.target.value);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            const response = await api.post("/auth/signup", {
                email: email,
                password: password
            });

            alert("User Created Successfully");
            navigate("/login");
        }

        catch(error) {
            console.error(error.response?.data || error.message);
            alert("Signup failed");
        }
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input type="text" name="email" value={email} placeholder="Enter email" onChange={handleChange}/>
                <input type="password" name="password" value={password} placeholder="Enter password" onChange={handleChange}/>
                <button type="submit">Register</button>
            </form>
        </div>
    );
}



