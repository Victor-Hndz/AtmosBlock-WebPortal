import { UpdateProfileFields, User } from "@Types/userTypes";

const API_URL = "http://localhost:3000";

export const getAllUsers = async (token: string): Promise<User[]> => {
    const response = await fetch(`${API_URL}/admin/users`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error("Error al cargar los usuarios");
    return await response.json();
};

export const changeUserTask = async (token: string, taskId: number, userId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/admin/tasks/${taskId}/${userId}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) throw new Error("Error al asignar usuario");
};

export const fetchAuthUser = async (token: string): Promise<User> => {
    const response = await fetch(`${API_URL}/user/profile`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) console.error("Error al obtener el perfil del usuario");
    console.log("response:", response);
    
    return await response.json(); 
};

export const UpdateUserProfile = async (token: string, newProfile: UpdateProfileFields): Promise<string> => {
    const response = await fetch(`${API_URL}/user/profile/update`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newProfile),
    });
    if (!response.ok) console.error("Error al actualizar el perfil del usuario");
    const data = await response.json(); 
    return data.message;
};
