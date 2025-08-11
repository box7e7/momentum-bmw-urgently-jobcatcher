import { getJobDetails,getAuthToken,extractJobInfo } from "./getJobDetails.js";
import { dispatchTowbook } from "./towbook-dispatch.js";


const func=async () => {
    let poNumber=9044026;


 
    let {token, isExpired}=await getAuthToken();

    // console.log(isExpired, token)
    if(!isExpired){
        const result = await getJobDetails(poNumber,token);
        console.log(extractJobInfo(result.data[0]));
        let job=extractJobInfo(result.data[0]);

        if(job.po_number){
            let result2=await dispatchTowbook(job,"");
            console.log(result2);
        }
    }
    

    // for (let i = 0; i < listJobs.length; i++) {
        
    // for (let i = 0; i < 1; i++) {   
    //     const result = await getJobDetails(listJobs[i],token);
    //     // console.log(result.data[0]);
    //     console.log(extractJobInfo(result.data[0]));
    //     let job=extractJobInfo(result.data[0]);

    //     console.log(job);

    //     // if(job.po_number){
    //     //     let result2=await dispatchTowbook(job,"");
    //     //     console.log(result2);
    //     // }
    // }
}

func();



