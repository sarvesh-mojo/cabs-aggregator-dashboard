import { Alert } from 'antd';

type AlertType = "success" | "info" | "warning" | "error";

export const ShowAlert = (AlertType:AlertType,Showmessage:string) => {

return(
    <>
    <Alert message={Showmessage} type={AlertType} showIcon closable />
  </>
)
}

